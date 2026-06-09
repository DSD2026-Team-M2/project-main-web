# Portuguese (PT-PT) translation fixes

This document explains the Portuguese translation changes applied to the M2 codebase, so any team member (or another AI assistant) can review or extend them.

## Audience

The M2 project is a UTAD × JLU collaboration. The Portuguese-speaking audience is **Portuguese (Portugal)**, not Brazilian. The previous translations used the `pt-BR` locale code and contained Brazilian Portuguese vocabulary, which is unfamiliar to UTAD users.

## What was wrong

Two recurring problems across both repositories:

1. **Missing diacritics.** About half the Portuguese strings had no accents (`Sessoes` instead of `Sessões`, `Estacao Clinica` instead of `Estação Clínica`). The dashboard `I18nContext.tsx` is the worst offender; the portal `pt.json` is mostly clean except for its `footer` section.

2. **Brazilian Portuguese vocabulary** (dashboard only). The dashboard uses `pt-BR` as its locale identifier and the strings reflect that: `Cadastro`, `Salvar`, `Carregando`, `Você`, `Buscar`, `Compartilhar`, `Monitoramento`, `Telas`, `Contatar`, `Pular`, etc.

## What was changed

### 1. `m2-clinical-web/src/i18n/I18nContext.tsx`

- **Locale renamed**: `'pt-BR'` → `'pt-PT'`, both in the `Locale` type and as the dictionary key.
- **localStorage migration**: users who already have `pt-BR` saved get automatically converted to `pt-PT` on next load (no manual reset needed). See `I18nProvider` initializer.
- **All Portuguese strings rewritten** to PT-PT with full diacritics.

### 2. `m2-clinical-web/src/i18n/terminology.json`

- Key renamed from `pt-BR` to `pt-PT` in every entry.
- Diacritics added (e.g. `Risco Médio`, `Recuperação Ótima`, `Pós-Operatória`).
- Two minor wording tweaks for PT-PT clinical usage:
  - `Liberação de Aderências` → `Libertação de Aderências`
  - `Caminho Clínico` → `Percurso Clínico`
  - `Teste de Fumaça` → `Smoke test` (kept in English — Portuguese tech jargon does not translate this)
  - `Lançamento Canário` → `Canary release` (same reason)

### 3. `project-portal/src/i18n/locales/pt.json`

- The `footer` section was missing all diacritics. Fixed.
- One English string (`"maintained": "Maintained on GitHub"`) translated to `"Mantido no GitHub"`.
- All other sections were already fine — no changes needed.

## PT-BR → PT-PT vocabulary mapping (reference)

If anyone adds new strings later, follow this table:

| PT-BR (don't use) | PT-PT (use this) |
|---|---|
| Salvar / Salvando | Guardar / A guardar |
| Carregando | A carregar |
| Cadastro / Cadastrar | Registo / Registar |
| Registro | Registo |
| Contatar | Contactar |
| Tela / Telas | Ecrã / Ecrãs |
| Você | (omit, or use direct verb form) |
| Compartilhar | Partilhar |
| Compartilhar visualização | Partilhar vista |
| Monitoramento | Monitorização |
| Pular | Saltar |
| Buscar | Pesquisar |
| Teste de fumaça | Smoke test (don't translate) |
| Lançamento Canário | Canary release (don't translate) |
| Liberar | Libertar |
| Aprimorado | Melhorado |
| Aprimoramento | Melhoria |
| Login (verb) | Iniciar sessão |
| Logout | Sair |
| Senha | Palavra-passe |
| Telefone celular | Telemóvel |
| Arquivo | Ficheiro |
| Email | E-mail (with hyphen) |
| Ônibus, Trem, etc. | Autocarro, Comboio (n/a here) |

## Style notes

- Use `e-mail` (with hyphen) and `palavra-passe` (with hyphen).
- Verb form for instructions in dialogs uses the impersonal (Indique, Selecione, Veja) rather than `Você...`.
- Loading states use `A carregar` (gerund-like progressive form), not `Carregando`.
- Technical jargon stays in English: `pipeline`, `rollback`, `gateway`, `API`, `token`, `log`, `smoke test`, `canary release`, `workflow`, `handoff`.

## Files in this delivery

```
i18n-fix/
├── dashboard/
│   ├── I18nContext.tsx         ← replace m2-clinical-web/src/i18n/I18nContext.tsx
│   └── terminology.json        ← replace m2-clinical-web/src/i18n/terminology.json
├── portal/
│   └── pt.json                 ← replace project-portal/src/i18n/locales/pt.json
└── TRANSLATION_FIXES.md        ← this doc
```

## Sanity checks performed

- `I18nContext.tsx`: the only remaining `'pt-BR'` references are inside the migration logic (intentional).
- `pt.json`: valid JSON (parses cleanly).
- `terminology.json`: valid JSON (parses cleanly).
- No keys were added or removed — only values changed and the locale identifier was renamed.

## What still needs human attention

- Brazilian users (if any are expected): the rewrite assumes PT-PT only. If both audiences are needed, the right fix is to keep both `pt-BR` and `pt-PT` as separate locales with their own dictionaries.
- The `runtime.ts` and any other places that hardcode `'pt-BR'` strings (none found in this audit) should be searched and updated too.
- New strings added after this PR must follow the vocabulary table above.
