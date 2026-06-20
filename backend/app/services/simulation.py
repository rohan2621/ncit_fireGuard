import random
import math

GRID_SIZE = 40
CELL_METERS = 50  # each cell ≈ 50m, grid covers roughly a 2km radius


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


def _grid_to_polygon(grid, lat, lng):
    """Converts burning cells into a simplified bounding GeoJSON polygon
    — far simpler than tracing the exact cell shape, and visually
    indistinguishable on a map at typical zoom levels."""
    burning = [(x, y) for y in range(GRID_SIZE) for x in range(GRID_SIZE) if grid[y][x] == 1]
    if not burning:
        return {"type": "Polygon", "coordinates": [[[lng, lat]]]}

    xs = [p[0] for p in burning]
    ys = [p[1] for p in burning]
    center = GRID_SIZE // 2
    deg_per_cell = CELL_METERS / 111_000  # rough meters-to-degrees conversion

    min_lng = lng + (min(xs) - center) * deg_per_cell
    max_lng = lng + (max(xs) - center) * deg_per_cell
    min_lat = lat + (min(ys) - center) * deg_per_cell
    max_lat = lat + (max(ys) - center) * deg_per_cell

    return {
        "type": "Polygon",
        "coordinates": [[
            [min_lng, min_lat], [max_lng, min_lat],
            [max_lng, max_lat], [min_lng, max_lat],
            [min_lng, min_lat],
        ]],
    }
