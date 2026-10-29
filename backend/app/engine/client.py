"""Central Ollama client wrapper and error mapping for Heirloom engine."""

from __future__ import annotations

import contextlib
from typing import Any, Mapping, Sequence

import httpx
import ollama
from ollama import ResponseError

from .errors import (
    EngineError,
    MODEL_FAILED,
    MODEL_NOT_INSTALLED,
    OLLAMA_NOT_RUNNING,
)

DEFAULT_HOST = "http://localhost:11434"
DEFAULT_MODEL = "gemma4:e2b"
DEFAULT_GENERATE_TIMEOUT = 300.0
DEFAULT_LIST_TIMEOUT = 10.0
DEFAULT_OPTIONS: dict[str, Any] = {
    "num_ctx": 4096,
    "temperature": 0,
}


def get_client(
    host: str | None = None,
    timeout: float = DEFAULT_GENERATE_TIMEOUT,
) -> ollama.Client:
    """Create and return an ollama.Client configured with host and timeout."""
    return ollama.Client(
        host=host or DEFAULT_HOST,
        timeout=timeout,
    )


@contextlib.contextmanager
def handle_ollama_errors(model: str | None = None):
    """
    Context manager to map Ollama client exceptions to EngineError.

    Mapping rules:
    - Connection failure -> ollama_not_running
    - ResponseError (404) -> model_not_installed (includes "ollama pull <model>")
    - Timeout, other ResponseError (e.g. 500), or any other error -> model_failed
    """
    try:
        yield
    except EngineError:
        raise
    except (ConnectionError, ConnectionRefusedError, httpx.ConnectError) as e:
        raise EngineError(
            OLLAMA_NOT_RUNNING,
            "Ollama isn't running, start the Ollama app and try again",
        ) from e
    except ResponseError as e:
        if e.status_code == 404:
            model_name = model or "<model>"
            raise EngineError(
                MODEL_NOT_INSTALLED,
                f"Model '{model_name}' is not installed. Run 'ollama pull {model_name}' to install it.",
            ) from e
        raise EngineError(
            MODEL_FAILED,
            f"Ollama error (status {e.status_code}): {e.error or str(e)}",
        ) from e
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            model_name = model or "<model>"
            raise EngineError(
                MODEL_NOT_INSTALLED,
                f"Model '{model_name}' is not installed. Run 'ollama pull {model_name}' to install it.",
            ) from e
        raise EngineError(
            MODEL_FAILED,
            f"Ollama HTTP error (status {e.response.status_code}): {e.response.text}",
        ) from e
    except (httpx.TimeoutException, TimeoutError) as e:
        raise EngineError(
            MODEL_FAILED,
            f"Ollama request timed out: {e}",
        ) from e
    except Exception as e:
        msg = str(e).lower()
        if (
            "connect" in msg
            or "refused" in msg
            or "failed to connect" in msg
            or "actively refused" in msg
            or "target machine actively refused it" in msg
            or "connection error" in msg
        ):
            raise EngineError(
                OLLAMA_NOT_RUNNING,
                "Ollama isn't running, start the Ollama app and try again",
            ) from e
        raise EngineError(
            MODEL_FAILED,
            f"Ollama request failed: {e}",
        ) from e


def list_models(
    client: ollama.Client | None = None,
    host: str | None = None,
    timeout: float = DEFAULT_LIST_TIMEOUT,
) -> list[str]:
    """
    List installed model names from Ollama.

    Args:
        client: Optional pre-configured ollama.Client.
        host: Optional Ollama host URL (default: http://localhost:11434).
        timeout: Timeout in seconds for listing models (default: 10.0).

    Raises:
        EngineError(ollama_not_running): If Ollama is not running.
        EngineError(model_failed): On unexpected server failure.
    """
    c = client or get_client(host=host, timeout=timeout)
    with handle_ollama_errors():
        response = c.list()
        models: list[str] = []
        raw_models = getattr(response, "models", None)
        if raw_models is None and isinstance(response, dict):
            raw_models = response.get("models", [])
        if raw_models:
            for m in raw_models:
                name = getattr(m, "model", None) or getattr(m, "name", None)
                if not name and isinstance(m, dict):
                    name = m.get("model") or m.get("name")
                if name:
                    models.append(str(name))
        return models


def generate(
    prompt: str,
    model: str = DEFAULT_MODEL,
    system: str = "",
    images: Sequence[Any] | None = None,
    format: str | Mapping[str, Any] | None = None,
    options: Mapping[str, Any] | None = None,
    client: ollama.Client | None = None,
    host: str | None = None,
    timeout: float = DEFAULT_GENERATE_TIMEOUT,
) -> str:
    """
    Generate text using Ollama, enforcing default num_ctx and temperature options.

    Args:
        prompt: The prompt text.
        model: Target model name (default: gemma4:e2b).
        system: Optional system prompt.
        images: Optional sequence of image file paths or bytes.
        format: Optional output format (e.g. 'json').
        options: Optional mapping of options overriding defaults.
        client: Optional pre-configured ollama.Client.
        host: Optional Ollama host URL.
        timeout: Timeout in seconds for generation (default: 300.0).

    Raises:
        EngineError(ollama_not_running): If Ollama is down.
        EngineError(model_not_installed): If the requested model is not installed (404).
        EngineError(model_failed): On timeout, empty output, 500 error, or other failure.
    """
    merged_options = dict(DEFAULT_OPTIONS)
    if options:
        merged_options.update(options)

    kwargs: dict[str, Any] = {
        "model": model,
        "prompt": prompt,
        "system": system,
        "images": images,
        "options": merged_options,
    }
    if format:
        kwargs["format"] = format

    c = client or get_client(host=host, timeout=timeout)
    with handle_ollama_errors(model=model):
        response = c.generate(**kwargs)
        output = getattr(response, "response", None)
        if output is None and isinstance(response, dict):
            output = response.get("response")

        if not output or not str(output).strip():
            raise EngineError(
                MODEL_FAILED,
                f"Model '{model}' returned an empty response.",
            )
        return str(output)


def chat(
    messages: Sequence[Mapping[str, Any]],
    model: str = DEFAULT_MODEL,
    format: str | Mapping[str, Any] | None = None,
    options: Mapping[str, Any] | None = None,
    client: ollama.Client | None = None,
    host: str | None = None,
    timeout: float = DEFAULT_GENERATE_TIMEOUT,
) -> str:
    """
    Chat using Ollama, enforcing default num_ctx and temperature options.

    Args:
        messages: Sequence of message dicts (e.g. [{"role": "user", "content": "..."}]).
        model: Target model name (default: gemma4:e2b).
        format: Optional output format (e.g. 'json').
        options: Optional mapping of options overriding defaults.
        client: Optional pre-configured ollama.Client.
        host: Optional Ollama host URL.
        timeout: Timeout in seconds for chat (default: 300.0).

    Raises:
        EngineError(ollama_not_running): If Ollama is down.
        EngineError(model_not_installed): If the requested model is not installed (404).
        EngineError(model_failed): On timeout, empty output, 500 error, or other failure.
    """
    merged_options = dict(DEFAULT_OPTIONS)
    if options:
        merged_options.update(options)

    kwargs: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "options": merged_options,
    }
    if format:
        kwargs["format"] = format

    c = client or get_client(host=host, timeout=timeout)
    with handle_ollama_errors(model=model):
        response = c.chat(**kwargs)
        msg = getattr(response, "message", None)
        content = getattr(msg, "content", None) if msg else None
        if content is None and isinstance(response, dict):
            content = response.get("message", {}).get("content")

        if not content or not str(content).strip():
            raise EngineError(
                MODEL_FAILED,
                f"Model '{model}' returned an empty response.",
            )
        return str(content)
