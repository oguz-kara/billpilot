# BillPilot — Spec (v1, 2026-08-30)

Portfolyo projesi #2 (strateji: upwork-strategy Bölüm 04/11). E-postayla gelen
PDF tedarikçi faturalarını Claude ile yapılandırılmış veriye çevirir, doğrular,
insan onayından geçirir ve QuickBooks Online'a çok satırlı bill olarak yazar.

## Taban değişikliği kararı · 2026-08-30

Bölüm 04'te taban `Nutlope/pdftochat` idi; inceleme sonrası
**`vercel-labs/ai-sdk-preview-pdf-support`** (Apache-2.0) seçildi:
pdftochat 37 bağımlılık + 4 depo katmanı + `ai v2` (3 major eski) taşıyor;
pdf-support ise güncel stack'le (ai v4, @ai-sdk/anthropic, Next 15, Zod)
tam bizim çekirdek işi yapıyor: PDF → Zod şemalı structured output stream.
Yan yana PDF görüntüleyici deseni pdftochat'ten kredilendirilerek alınacak.

## Persona (kurgusal)

Northgate Property Management — 40 bina, ~450 tedarikçi faturası/ay
(tesisatçı, peyzaj, elektrik), QBO'da yarı zamanlı bir muhasebeci. Tetik:
satın almayla 12 bina eklendi; Hubdoc faturayı mülklere bölemiyor; çeyrek
kapanışında çift ödeme şikâyeti. Detaylar: Bölüm 11 §2.

## Kapsam

**v1 — çıkarım çekirdeği (2026-08-30 tamamlandı, mock'ta uçtan uca doğrulandı)**
- [x] `lib/schemas.ts`: fatura şeması (vendor, invoiceNumber, date, currency,
      lineItems[{description, serviceAddress, amount}], tax, total,
      confidence — model öz-değerlendirmesi)
- [x] `/api/extract` + `lib/extract.ts`: Claude native PDF → generateObject;
      model `BILLPILOT_MODEL ?? claude-sonnet-5`
- [x] `lib/validate.ts`: Σ kontrolü (±0.01) · güven <0.85 → kuyruk ·
      mülk eşleme (satır adresi → açıklama metni → vendor default split) ·
      çift ödeme (vendor+no+total, 90 gün) → status: approved-pending/review
- [x] Mock modu `BILLPILOT_MOCK=1`: fixture'larda ground truth döner
- [x] Store v1 + `npm run fixtures` (5 kurgusal PDF + truth.json; kasıtlı:
      1 bozuk toplam, 1 düşük güven/adressiz, 1 kopya) + `npm run batch`
      (alan doğruluğu, yakalama sayıları, kuyruk oranı ölçümü)
- [ ] Test setini 30 faturaya genişlet (taranmış görünümlü varyantlar dahil)
      — gerçek koşudan önce

**v2 — inceleme UI + entegrasyon (2026-08-30 çekirdeği tamam)**
- [x] İnceleme ekranı (`ProcessView`): solda PDF embed, sağda alanlar +
      bayraklar + mülk-eşlemeli satır tablosu + Approve → QBO payload
      görünümü (düzenlenebilir form alanları v2.1'e)
- [x] Primitive dili portu (`components/bp/ui.tsx`): Shell, StatusChip,
      Mono, MockChip — Prequal'le aynı ledger estetiği, açık tema
- [x] `/invoices` sicil tablosu (satır → mülk kodları + bayraklar)
- [x] `/api/approve` + `lib/qbo.ts`: çok satırlı Bill payload'u (satır
      başına ClassRef=mülk kodu; stok n8n QBO node'unun tek-satır kusurunu
      aşan yapı); gerçek POST QBO sandbox OAuth'la gelecek (simülasyon)
- [x] n8n `billpilot.json` — **uçtan uca doğrulandı** (Docker import +
      webhook → extract → store; GreenScape 3 mülke bölündü, tekrar
      gönderim duplicate olarak yakalandı)
- [ ] v2.1: inceleme formunda alan düzenleme; $2.000 üstü Slack onayı;
      Gmail trigger'ın gerçek bağlanması
- [ ] QBO sandbox entegrasyonu (Intuit developer hesabı — ücretsiz)

**v3 — dashboard**
- [ ] Kuyruk/istatistik: işlenen fatura, kuyruğa düşen oran, Σ kontrolünün
      yakaladığı hata sayısı, mülk başına gider dağılımı

## Ölçüm protokolü

Etiketli test seti: 30 kurgusal fatura PDF'i (v1'de üretilecek — temiz
dijital + taranmış görünümlü karışık; alan bazında ground truth JSON).
Metrikler: alan doğruluğu (%), satır kalemi doğruluğu, Σ kontrolü yakalama
sayısı, kuyruk oranı, fatura başına süre/token. Yalnız gerçek koşu README
"Measured"a girer; mock asla.

## Portfolyo varlıkları (3 kart)

1. İnceleme ekranı görüntüsü (PDF + form yan yana)
2. Mimari diyagram: e-posta → Claude → Σ kontrol → mülk eşleme → onay → QBO
3. Loom: "Hubdoc'un yapamadığı: tek faturayı 6 mülke bölmek" anlatısı

## Attribution

Base: vercel-labs/ai-sdk-preview-pdf-support (Apache-2.0, LICENSE korunur).
Viewer deseni: Nutlope/pdftochat (MIT) — kredilendirilir. Workflow referansı:
n8n template #14085.
