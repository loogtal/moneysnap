import threading
import time

_lock = threading.Lock()
_last_call_time = 0.0
MIN_INTERVAL = 2.2  # ~27 RPM — safely under Gemini free tier 30 RPM limit


def acquire():
    """Block until it's safe to make a Gemini API call. Thread-safe."""
    global _last_call_time
    with _lock:
        now = time.time()
        gap = MIN_INTERVAL - (now - _last_call_time)
        if gap > 0:
            time.sleep(gap)
        _last_call_time = time.time()
