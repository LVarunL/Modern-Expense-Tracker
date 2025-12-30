"""LLM client for parsing."""

from __future__ import annotations

import json
from typing import Any

import httpx

from src.parser.prompts import FEW_SHOT_EXAMPLES, build_system_message


class LLMClientError(RuntimeError):
    pass


class OpenAIChatClient:
    def __init__(
        self,
        *,
        api_key: str,
        base_url: str,
        model: str,
        timeout_seconds: float,
        temperature: float,
    ) -> None:
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._timeout = timeout_seconds
        self._temperature = temperature

    def _build_messages(
        self,
        raw_text: str,
        occurred_at_hint: str | None,
        reference_datetime: str,
        timezone: str,
    ) -> list[dict[str, str]]:
        system_message = build_system_message()
        messages: list[dict[str, str]] = [{"role": "system", "content": system_message}]
        for example in FEW_SHOT_EXAMPLES:
            messages.append({"role": "user", "content": example["input"]})
            messages.append({"role": "assistant", "content": example["output"]})

        hint_line = f"occurred_at_hint: {occurred_at_hint}" if occurred_at_hint else "occurred_at_hint: null"
        messages.append(
            {
                "role": "user",
                "content": (
                    f"reference_datetime: {reference_datetime}\n"
                    f"timezone: {timezone}\n"
                    f"text: {raw_text}\n"
                    f"{hint_line}"
                ),
            }
        )
        return messages

    async def parse(
        self,
        *,
        raw_text: str,
        occurred_at_hint: str | None,
        reference_datetime: str,
        timezone: str,
    ) -> dict[str, Any]:
        messages = self._build_messages(raw_text, occurred_at_hint, reference_datetime, timezone)
        payload = {
            "model": self._model,
            "messages": messages,
            "temperature": self._temperature,
            "response_format": {"type": "json_object"},
        }

        headers = {"Authorization": f"Bearer {self._api_key}"}
        async with httpx.AsyncClient(
            base_url=self._base_url,
            timeout=self._timeout,
        ) as client:
            response = await client.post("/v1/chat/completions", json=payload, headers=headers)

        if response.status_code >= 400:
            raise LLMClientError(f"LLM request failed: {response.status_code} {response.text}")

        data = response.json()
        try:
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as exc:
            raise LLMClientError("LLM response missing content") from exc

        return _safe_json_parse(content)


class GeminiClient:
    def __init__(
        self,
        *,
        api_key: str,
        base_url: str,
        model: str,
        timeout_seconds: float,
        temperature: float,
    ) -> None:
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._timeout = timeout_seconds
        self._temperature = temperature

    def _build_contents(
        self,
        raw_text: str,
        occurred_at_hint: str | None,
        reference_datetime: str,
        timezone: str,
    ) -> list[dict[str, object]]:
        contents: list[dict[str, Any]] = []
        for example in FEW_SHOT_EXAMPLES:
            contents.append({"role": "user", "parts": [{"text": example["input"]}]})
            contents.append({"role": "model", "parts": [{"text": example["output"]}]})

        hint_line = f"occurred_at_hint: {occurred_at_hint}" if occurred_at_hint else "occurred_at_hint: null"
        contents.append(
            {
                "role": "user",
                "parts": [
                    {
                        "text": (
                            f"reference_datetime: {reference_datetime}\n"
                            f"timezone: {timezone}\n"
                            f"text: {raw_text}\n"
                            f"{hint_line}"
                        )
                    }
                ],
            }
        )
        return contents

    async def parse(
        self,
        *,
        raw_text: str,
        occurred_at_hint: str | None,
        reference_datetime: str,
        timezone: str,
    ) -> dict[str, Any]:
        contents = self._build_contents(raw_text, occurred_at_hint, reference_datetime, timezone)
        payload = {
            "contents": contents,
            "systemInstruction": {"parts": [{"text": build_system_message()}]},
            "generationConfig": {
                "temperature": self._temperature,
                "responseMimeType": "application/json",
            },
        }

        headers = {"x-goog-api-key": self._api_key}
        url = f"/v1beta/models/{self._model}:generateContent"
        async with httpx.AsyncClient(
            base_url=self._base_url,
            timeout=self._timeout,
        ) as client:
            response = await client.post(url, json=payload, headers=headers)

        if response.status_code >= 400:
            raise LLMClientError(f"LLM request failed: {response.status_code} {response.text}")

        data = response.json()
        text = _extract_gemini_text(data)
        return _safe_json_parse(text)


def _safe_json_parse(content: str) -> dict[str, Any]:
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        start = content.find("{")
        end = content.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise LLMClientError("LLM response was not valid JSON")
        try:
            return json.loads(content[start : end + 1])
        except json.JSONDecodeError as exc:
            raise LLMClientError("LLM response was not valid JSON") from exc


def _extract_gemini_text(data: dict[str, Any]) -> str:
    try:
        parts = data["candidates"][0]["content"]["parts"]
    except (KeyError, IndexError) as exc:
        raise LLMClientError("Gemini response missing content") from exc
    text = "".join(part.get("text", "") for part in parts)
    if not text:
        raise LLMClientError("Gemini response was empty")
    return text
