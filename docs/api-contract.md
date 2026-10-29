# Shared API Contract

## API Routes (Base: http://localhost:8000)

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/api/health` | none | `{ollama_running, installed_models}` |
| GET | `/api/settings` | none | `{model, target_language}` |
| PUT | `/api/settings` | `{model, target_language}` | the same object |
| GET | `/api/pages` | optional `?q=text` | `{pages: PageSummary[]}` |
| POST | `/api/pages` | multipart: `image`, `language_hint`, `writer`, `approx_date` | `{id, status}` |
| GET | `/api/pages/{id}` | none | `Page` |
| POST | `/api/pages/{id}/corrections` | `{start, end, new_text}` | `Page` |
| POST | `/api/pages/{id}/refresh` | none | `Page` |

## Data Shapes

```json
// PageSummary
{  
  "id": 12, 
  "title": "Letter, 1952", 
  "thumbnail_url": "/media/thumbs/12.jpg",  
  "added_at": "2026-10-30T10:15:00", 
  "status": "done",  
  "snippet": "text around the match, only when searching"
}

// Page
{  
  "id": 12, 
  "title": "Letter, 1952", 
  "image_url": "/media/pages/12.jpg",  
  "status": "queued | transcribing | translating | extracting | done | error",  
  "error": null, 
  "model": "gemma4:e2b",  
  "language_hint": null, 
  "writer": null, 
  "approx_date": null,  
  "transcript": {    
    "text": "the current text, with corrections applied",    
    "uncertain": [{"start": 10, "end": 17}],    
    "corrections": [{"start": 10, "end": 17, "old": "...", "new": "...", "at": "2026-10-30T10:30:00"}]  
  },  
  "translation": {"language": "English", "text": "..."},  
  "facts": [{"id": 1, "kind": "person | place | date | item", "text": "...", "start": 4, "end": 9}]
}
```

## Rules for Consistency
* `start` and `end` are character positions in `transcript.text` (start included, end excluded).
* After a correction, the backend removes that span from `uncertain`, shifts the later spans by the change in length, and records the correction. Fact positions are recalculated by Refresh, so until then the frontend shows a small "refresh to update" note.
* `target_language` is a plain language name such as "English".
* `title` is the writer or date if given, otherwise "Page" plus its number.

## Engine Functions (Backend <-> Model)
Arushi implements these in `backend/app/engine/`. Aniruddha calls them and uses a stub that returns canned data until the real ones are ready.

* `list_models() -> list[str]`
* `transcribe(image_path, model, language_hint=None) -> {"text": str, "uncertain": [{"start": int, "end": int}]}`
* `translate(text, target_language, model) -> str`
* `extract(text, model) -> [{"kind": str, "text": str, "start": int, "end": int}]`

**Error Handling:** Every function raises `EngineError(code, message)` using the same three error codes as the API. Errors return an HTTP error status and `{"error": {"code": "...", "message": "..."}}`. The codes the frontend handles are `ollama_not_running`, `model_not_installed` and `model_failed`.