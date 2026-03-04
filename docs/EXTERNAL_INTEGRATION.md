# External Integration Guide

This application stores logs in a Supabase database. External applications can consume these logs in real-time or via REST API.

## 1. REST API Access

You can fetch logs via standard HTTP requests.

**Endpoint:** `https://vedckaefmpptxcfpdvft.supabase.co/rest/v1/logs`
**Method:** `GET`
**Headers:**
- `apikey`: `YOUR_SUPABASE_ANON_KEY` (or Service Role key for backend)
- `Authorization`: `Bearer YOUR_KEY`

Example:
```bash
curl 'https://vedckaefmpptxcfpdvft.supabase.co/rest/v1/logs?select=*&order=created_at.desc&limit=10' \
  -H "apikey: SUPABASE_KEY" \
  -H "Authorization: Bearer SUPABASE_KEY"
```

## 2. Real-Time (WebSockets)

To listen for new events as they happen, use the `supabase-js` client.

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient('https://vedckaefmpptxcfpdvft.supabase.co', 'YOUR_SUPABASE_KEY')

const channel = supabase
  .channel('external-app')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'logs' },
    (payload) => {
      console.log('New Event Received:', payload.new)
    }
  )
  .subscribe()
```

## 3. Data Structure

Events (`payload.new`) will look like this:

```json
{
  "id": "uuid...",
  "type": "DELIVERY", // VISITOR, ROUND, INCIDENT, SERVICE
  "title": "Domicilio Rappi",
  "occurred_at": "2024-01-24T10:00:00Z",
  "details": {
    "name": "Rappi",
    "destination": "101"
  }
}
```
