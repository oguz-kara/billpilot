# n8n — BillPilot Invoice Intake

`billpilot.json`: fatura webhook'u (üretimde Gmail trigger: ap@ kutusuna
gelen ek) → `/api/extract` (Claude çıkarım + Σ/güven/mülk/çift ödeme
kontrolleri) → `review` ise insan kuyruğu, değilse onay → QBO çok satırlı
bill. Kurulum Prequal'dekiyle aynı (docker + import + activate); test için
port 3001'de çalışan BillPilot gerekir. Referans: n8n template #14085
(tek-satır QBO kusuru bu pipeline'da HTTP ile aşılır).
