import random
import math

GRID_SIZE = 40
CELL_METERS = 50  # each cell ≈ 50m, grid spans roughly 2km across


def run_simulation(lat: float, lng: float, wind_speed: float, wind_dir: float):
    """Pure-Python cellular automaton. Fire spreads cell-to-cell, biased
    by wind direction/speed. Simplified vs real fire-science models
    (e.g. Rothermel), but grounded enough for a believable visualization,
    buildable in hours instead of weeks."""
    grid = [[0 for _ in range(GRID_SIZE)] for _ in range(GRID_SIZE)]
    center = GRID_SIZE // 2
    grid[center][center] = 1  # ignition point
    frames = {}
    targets = {10: 1, 30: 3, 60: 6, 180: 18}  # steps to reach each checkpoint
    step = 0
    for target_minute, target_steps in targets.items():
        while step < target_steps:
            grid = _spread_step(grid, wind_speed, wind_dir)
            step += 1
        frames[target_minute] = _grid_to_polygon(grid, lat, lng)
    return frames


def _spread_step(grid, wind_speed, wind_dir):
    new_grid = [row[:] for row in grid]
    wind_bias = min(wind_speed / 40, 1.0)
    for y in range(GRID_SIZE):
        for x in range(GRID_SIZE):
            if grid[y][x] == 1:
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < GRID_SIZE and 0 <= nx < GRID_SIZE and grid[ny][nx] == 0:
                            base_prob = 0.15
                            if _is_downwind(dx, dy, wind_dir):
                                base_prob += 0.25 * wind_bias
                            if random.random() < base_prob:
                                new_grid[ny][nx] = 1
    return new_grid


def _is_downwind(dx, dy, wind_dir):
    cell_angle = math.degrees(math.atan2(dy, dx)) % 360
    return abs((cell_angle - wind_dir + 180) % 360 - 180) < 60


def _convex_hull(points):
    """Andrew's monotone chain convex hull — pure Python, no new
    dependencies. Traces the true outer boundary of the burning cells
    instead of boxing them into a rectangle, which matters a lot for
    wind-driven fires since they spread in an elongated shape, not a
    square."""
    pts = sorted(set(points))
    if len(pts) <= 2:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower = []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    upper = []
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def _grid_to_polygon(grid, lat, lng):
    """Converts burning cells into a GeoJSON polygon tracing the actual
    convex hull of the burn shape, rather than a bounding rectangle —
    meaningfully more accurate for the elongated, irregular shapes
    wind-driven fire spread actually produces."""
    burning = [(x, y) for y in range(GRID_SIZE) for x in range(GRID_SIZE) if grid[y][x] == 1]
    if not burning:
        return {"type": "Polygon", "coordinates": [[[lng, lat]]]}

    center = GRID_SIZE // 2
    deg_per_cell = CELL_METERS / 111_000  # rough meters-to-degrees conversion

    hull = _convex_hull(burning)

    if len(hull) < 3:
        # Too few burning cells for a real hull yet (e.g. very early frames) —
        # fall back to a small square around the point(s) so downstream area
        # calculation and map rendering still get a valid polygon.
        x, y = burning[0]
        half = 1
        ring_cells = [(x - half, y - half), (x + half, y - half),
                      (x + half, y + half), (x - half, y + half)]
    else:
        ring_cells = hull

    ring = [
        [lng + (cx - center) * deg_per_cell, lat + (cy - center) * deg_per_cell]
        for cx, cy in ring_cells
    ]
    ring.append(ring[0])  # close the ring

    return {"type": "Polygon", "coordinates": [ring]}