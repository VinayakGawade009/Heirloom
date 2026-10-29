"""Model listing and discovery for Heirloom engine."""

from .client import DEFAULT_LIST_TIMEOUT, list_models as _client_list_models


def list_models(timeout: float = DEFAULT_LIST_TIMEOUT) -> list[str]:
    """
    List installed Ollama model names.

    Args:
        timeout: Timeout in seconds for the list request (default: 10.0).

    Returns:
        list[str]: Installed model names (e.g. ['gemma4:e2b']).

    Raises:
        EngineError: With code 'ollama_not_running' if the Ollama server is down.
    """
    return _client_list_models(timeout=timeout)
