"""Parser service that calls the LLM and applies post-processing."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from pydantic import ValidationError

from src.config import get_settings
from src.parser.client import GeminiClient, LLMClientError, OpenAIChatClient
from src.parser.postprocess import post_process
from src.parser.schema import LLMParseOutput


class ParserError(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class ParsedResult:
    preview: dict[str, Any]
    raw_output: dict[str, Any]
    post_processed: dict[str, Any]
    parser_version: str


class LLMParser:
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.llm_api_key:
            raise ParserError("LLM_API_KEY is not configured")
        if settings.llm_provider == "openai":
            self._client = OpenAIChatClient(
                api_key=settings.llm_api_key,
                base_url=settings.llm_base_url,
                model=settings.llm_model,
                timeout_seconds=settings.llm_timeout_seconds,
                temperature=settings.llm_temperature,
            )
        elif settings.llm_provider == "gemini":
            self._client = GeminiClient(
                api_key=settings.llm_api_key,
                base_url=settings.llm_base_url,
                model=settings.llm_model,
                timeout_seconds=settings.llm_timeout_seconds,
                temperature=settings.llm_temperature,
            )
        else:
            raise ParserError(f"Unsupported LLM_PROVIDER: {settings.llm_provider}")
        self._parser_version = settings.parser_version

    async def parse(
        self,
        *,
        raw_text: str,
        reference_datetime: datetime,
    ) -> ParsedResult:
        try:
            raw_output = await self._client.parse(
                raw_text=raw_text,
                reference_datetime=reference_datetime.isoformat(),
            )
        except LLMClientError as exc:
            raise ParserError(str(exc)) from exc

        try:
            parsed = LLMParseOutput.model_validate(raw_output)
        except ValidationError as exc:
            raise ParserError(f"LLM output validation failed: {exc}") from exc

        post_processed = post_process(parsed, raw_text)
        return ParsedResult(
            preview=post_processed,
            raw_output=raw_output,
            post_processed=post_processed,
            parser_version=self._parser_version,
        )


def get_parser() -> LLMParser:
    return LLMParser()
