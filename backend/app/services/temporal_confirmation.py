from collections import defaultdict

N_FRAMES_REQUIRED = 3


class TemporalConfirmer:
    """Tracks consecutive positive detections per video source.
    Prevents one bad frame (glare, fog, sunset) from creating a false Incident."""

    def __init__(self, n_required: int = N_FRAMES_REQUIRED):
        self.n_required = n_required
        self.counters = defaultdict(int)
        self.confirmed = set()

    def update(self, source_id: str, detected: bool) -> bool:
        """Returns True exactly once — the frame the threshold is first crossed."""
        if not detected:
            self.counters[source_id] = 0
            return False

        self.counters[source_id] += 1

        if self.counters[source_id] >= self.n_required and source_id not in self.confirmed:
            self.confirmed.add(source_id)
            return True
        return False

    def reset(self, source_id: str):
        self.counters[source_id] = 0
        self.confirmed.discard(source_id)


confirmer = TemporalConfirmer()
