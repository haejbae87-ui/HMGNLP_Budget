# 諭껋? ?쒖뒪???붽뎄?ы빆 ?뺤쓽??(PRD)

> **?묒꽦 諛⑹떇**: 肄붾뱶 ??텛??(Reverse PRD)  
> **?꾨찓??*: 諭껋? 愿由?(Badge Management)  
> **愿???뚯씪**: `bo_badge_group.js`, `bo_badge_mgmt.js`, `bo_badge_operation.js`  
> **理쒖큹 ?묒꽦**: 2026-04-08  
> **理쒖쥌 媛깆떊**: 2026-04-08  
> **?곹깭**: ?윞 援ы쁽 媛??ㅼ닔 (?먮룞 ?됯? ?붿쭊 誘멸뎄??

---

## 1. ?쒖뒪??媛쒖슂

諭껋? ?쒖뒪?쒖? **?숈뒿?먯쓽 ??웾 痍⑤뱷???몄쬆?섎뒗 ?붿???諛곗? 愿由??뚮옯??*?낅땲??  
?뚯궗(Tenant) ??媛?곸“吏?VOrg, `service_type='badge'`) ??諭껋? 洹몃９ ??諭껋? ?쒖쑝濡?怨꾩링 援ъ“瑜?媛뽰뒿?덈떎.

```
Tenant (?뚯궗)
  ?붴? VOrg Template (service_type='badge')
        ?붴? Badge Group (??웾 ?곸뿭: ?? 媛쒕컻湲곗닠, 由щ뜑??
              ?붴? Badge (?④퀎蹂?諭껋?: Level 1, Level 2, ...)
                    ?붴? User Badge (媛쒖씤蹂?痍⑤뱷 ?대젰)
```

---

## 2. DB ?뚯씠釉?援ъ“

### `badge_groups`
| 而щ읆 | ???| ?ㅻ챸 |
|---|---|---|
| `id` | UUID PK | |
| `tenant_id` | FK | ?뚯냽 ?뚯궗 |
| `vorg_template_id` | FK | ?곌껐??媛?곸“吏?(badge ?⑸룄留? |
| `name` | string | 洹몃９紐?(?? HMC ?곗씠???꾨Ц媛 諭껋? 洹몃９) |
| `description` | text | ?ㅻ챸 |
| `created_at` | timestamp | |

### `badges`
| 而щ읆 | ???| ?ㅻ챸 |
|---|---|---|
| `id` | UUID PK | |
| `group_id` | FK ??badge_groups | |
| `name` | string | 諭껋?紐?|
| `level` | string | ?④퀎 (?? Level 1, Level 2) |
| `valid_months` | integer | ?좏슚湲곌컙(媛쒖썡). null = ?곴뎄 |
| `allow_manual_award` | boolean | ?댁쁺???섎룞 諛쒓툒 ?덉슜 ?щ? |
| `prerequisite_badge_id` | FK ??badges | ?좎닔 諭껋? |
| `equivalent_badge_ids` | UUID[] | ????곹샇 ?몄젙 諭껋? ID 諛곗뿴 |
| `condition_rules` | jsonb | 理쒖큹 痍⑤뱷 議곌굔 (猷?JSON) |
| `renewal_rules` | jsonb | 媛깆떊 議곌굔. `{}` = 痍⑤뱷 議곌굔怨??숈씪 |
| `updated_at` | timestamp | |

### `user_badges`
| 而щ읆 | ???| ?ㅻ챸 |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | string | ?숈뒿??ID |
| `badge_id` | FK ??badges | |
| `tenant_id` | FK | |
| `status` | enum | `IN_PROGRESS` / `COURSE_COMPLETED` / `ACTIVE` / `EXPIRED` |
| `acquired_at` | timestamp | |
| `expires_at` | timestamp | null = ?곴뎄 |
| `created_at` | timestamp | |

### `badge_award_requests` (?섎룞 ?ъ궗)
| 而щ읆 | ???| ?ㅻ챸 |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | string | |
| `badge_id` | FK ??badges | |
| `status` | enum | `PENDING` / `APPROVED` / `REJECTED` |
| `proof_file_url` | string | 利앸튃 ?뚯씪 |
| `admin_comment` | text | 諛섎젮 ?ъ쑀 |
| `requested_at` | timestamp | |
| `reviewed_at` | timestamp | |

---

## 3. condition_rules JSON ?ㅽ럺

```json
{
  "operator": "AND",
  "nodes": [
    { "type": "course_group", "mode": "path", "items": ["course_id_1", "course_id_2"] },
    { "type": "course_group", "mode": "pool", "required_count": 2, "items": ["A", "B", "C"] },
    { "type": "exam", "exam_id": "exam_uuid", "pass_score": 80 }
  ]
}
```

| ?좏삎 | mode | ?섎? |
|---|---|---|
| course_group | path | items ?쒖꽌?濡??댁닔 媛뺤젣 |
| course_group | pool | required_count媛??댁긽 ?댁닔 |
| exam | - | ?쒗뿕 pass_score% ?댁긽 |

---

## 4. ?붾㈃蹂?湲곕뒫 ?붽뎄?ы빆

### 4-1. 諭껋? 洹몃９ 愿由?
| 湲곕뒫 | 援ы쁽 ?곹깭 |
|---|---|
| ?뚯궗/媛?곸“吏??꾪꽣 | ???꾨즺 |
| 洹몃９ ?앹꽦 | ???꾨즺 |
| 洹몃９ ??젣 | ???꾨즺 |
| **洹몃９ ?섏젙** | ??誘멸뎄??|

### 4-2. 諭껋? 湲곗? ?ㅼ젙

| 湲곕뒫 | 援ы쁽 ?곹깭 |
|---|---|
| ?뚯궗/媛?곸“吏?諭껋?洹몃９ ?꾪꽣 | ???꾨즺 |
| 諭껋? 紐⑸줉 議고쉶 | ???꾨즺 |
| 諭껋? ?앹꽦/?섏젙 (?곸꽭 ?섏씠吏) | ???꾨즺 (2026-04-08 ?앹뾽?믪긽???꾪솚) |
| ?쒓컖??猷?鍮뚮뜑 | ???꾨즺 |
| 諭껋? ??젣 | ???꾨즺 |

### 4-3. 諭껋? ?ъ궗 諛??꾪솴

| 湲곕뒫 | 援ы쁽 ?곹깭 |
|---|---|
| ?섎룞 ?ъ궗 ?붿껌 紐⑸줉 | ???꾨즺 |
| ?뱀씤/諛섎젮 泥섎━ | ???꾨즺 |
| ?꾪솴 ?몃옒而?| ???꾨즺 |
| **吏곴텒 ?꾩쓽 諛쒓툒** | ??誘멸뎄??(UI留?議댁옱) |
| **?쒗뿕 ?덈궡 硫붿씪** | ??誘멸뎄??(UI留?議댁옱) |
| **媛깆떊 ?낅젮 硫붿씪** | ??誘멸뎄??(UI留?議댁옱) |

---

## 5. ?곹깭 ?꾩씠

```
(?쒖옉) ??IN_PROGRESS ??COURSE_COMPLETED ??[?쒗뿕 ?⑷꺽] ??ACTIVE
                                                          ??                                          [?좏슚湲곌컙 寃쎄낵] ??EXPIRED
                                          [媛깆떊 ?꾨즺]    ??ACTIVE
```

---

## 6. ?묎렐 沅뚰븳

| ??븷 | 洹몃９ 愿由?| 湲곗? ?ㅼ젙 | ?ъ궗/?꾪솴 |
|---|---|---|---|
| platform_admin | ?꾩껜 | ?꾩껜 | ?꾩껜 |
| tenant_global_admin | ?뚯냽 | ?뚯냽 | ?뚯냽 |
| 洹???| - | - | - |

---

## 7. 湲고쉷??寃???꾩슂 ??ぉ

> **?뵶 CRITICAL: ?먮룞 痍⑤뱷 ?됯? ?붿쭊 誘멸뎄??*
>
> `condition_rules`瑜???ν븯??湲곕뒫? ?덉쑝?? ?숈뒿 ?댁닔瑜??ㅼ떆媛??됯??섏뿬 諭껋?瑜??먮룞 諛쒓툒?섎뒗 諛깆뿏??濡쒖쭅???놁쓬.
> - `IN_PROGRESS ??COURSE_COMPLETED` ?꾩씠 ?몃━嫄??꾩슂
> - `COURSE_COMPLETED ??ACTIVE` ?쒗뿕 ?⑷꺽 ?먯젙 ?꾩슂
> - `ACTIVE ??EXPIRED` 留뚮즺 諛곗튂 泥섎━ ?꾩슂 (Supabase Edge Function ?먮뒗 pg_cron)

| 踰덊샇 | ??ぉ | ?댁슜 |
|---|---|---|
| 1 | 吏곴텒 諛쒓툒 | ?ъ슜??諭껋? ?좏깮 紐⑤떖 援ы쁽 ?꾩슂 |
| 2 | 硫붿씪 諛쒖넚 | ?쒗뿕 ?덈궡, 媛깆떊 ?낅젮 ?뚮┝ ?곕룞 ?꾩슂 |
| 3 | ?섎룞 ?⑥뒪 | `testForceActivate` ?곕え 肄붾뱶 ???ㅺ린??援ы쁽 ?꾩슂 |
| 4 | 洹몃９ ?섏젙 | ?섏젙 湲곕뒫 ?꾨씫 |
| 5 | EXPIRED_SOON | 30???섎뱶肄붾뵫 ???ㅼ젙 媛?ν븯?꾨줉 蹂寃??꾩슂 |
| 6 | ?꾪솴 ?몃옒而?| user_id留??쒖떆 ???대쫫/遺??議곗씤 ?꾩슂 |
| 7 | exam_id | ?쒗뿕 愿由??뚯씠釉??곕룞 ?ㅽ럺 ?뺤쓽 ?꾩슂 |
| 8 | cascade | 諭껋? ??젣 ??user_badges cascade ?뺤콉 ?뺤씤 ?꾩슂 |

---

## 8. 蹂寃??대젰

| ?좎쭨 | 蹂寃??댁슜 | ?묒꽦??|
|---|---|---|
| 2026-04-08 | 理쒖큹 ?묒꽦 (肄붾뱶 ??텛?? | AI |
| 2026-04-08 | 諭껋? 湲곗? ?ㅼ젙 ?곸꽭 ?섏씠吏 ?꾪솚 諛섏쁺 | AI |
