<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Netlify hosting: when `NETLIFY=true`, `vite.config.ts` disables Nitro and uses `@netlify/vite-plugin-tanstack-start` (publish `dist/client`); Lovable builds keep Nitro — never enable both at once.
