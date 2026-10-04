# Newsletter Brand Videos — "SL Tech Students Weekly" × "SL Tech Radar"

Brand: dark premium-tech background, neon-cyan (#22d3ee) glow accents, cinematic 3D motion graphics (not cartoonish). Tagline: **"Never miss a deadline that matters."**

## The clips

| File | Duration | Size | What it shows |
|---|---|---|---|
| `intro-stinger.mp4` | 5.0 s | ~1.0 MB | Opener: a glowing cyan 3D tech-emblem with cyan light trails sweeping past it, slow push-in zoom with a fade-in from black. Abstract (no text) so it can never garble a word. |
| `promo-clip.mp4` | 10.0 s | ~5.9 MB | Promo: a futuristic radar sweeps across a dark digital campus map; deadlines light up as cyan nodes ("ASSIGNMENT DUE", "HACKATHON EVENT", "CAREER FAIR", "WORKSHOP REGISTRATION", "LAB SESSION"); a "NEWSLETTER DASHBOARD" panel shows weekly updates; it ends on a clean title card: **"SL Tech Students Weekly / SL Tech Radar — Never miss a deadline that matters."** (AI-generated, includes audio track.) |
| `outro-bumper.mp4` | 5.0 s | ~0.54 MB | Outro: a calm glowing cyan radar emblem fading softly amid drifting particles, slow pull-back zoom with a fade to black. Abstract (no text) — pair with an end-card in your editor for the subscribe CTA. |

All 1280×720 (16:9), H.264, 24 fps — lightweight for web embeds and social posts.

### Bonus assets in this folder
- `brand-intro-keyframe.webp` / `brand-outro-keyframe.webp` — the AI-generated 3D keyframes the stingers were animated from; handy as newsletter header art or video thumbnails/posters.

## Suggested use
- **Substack**: use `promo-clip.mp4` as a pinned welcome-post embed; `intro-stinger.mp4` + `outro-bumper.mp4` as bookends for any newsletter video explainers.
- **Social posts (Instagram/LinkedIn/Threads)**: `promo-clip.mp4` standalone as a launch promo; the final frame already carries the tagline.
- **LinkedIn demo video**: bookend the SL Tech Radar demo with the intro stinger and outro bumper for a branded feel.
- Note: the intro/outro are **silent** (no audio track). Add music/SFX in your editor (CapCut, DaVinci, etc.). The promo has a generated ambient audio track — swap or duck it as needed.

## How to regenerate variants
1. **Full AI video** (what `promo-clip.mp4` is): use the media pipeline's video generation with a prompt describing the scene, brand colors (dark bg, neon-cyan #22d3ee), and exact required text in quotes. The pipeline currently renders **fixed ~10 s clips at 720p** — you cannot request 5 s or 15 s directly; trim or loop in post.
2. **Keyframe animation** (what intro/outro are): generate a 16:9 keyframe image with the media pipeline's image generation (specify "no text" to avoid garbled lettering), then animate with ffmpeg Ken Burns:
   - Zoom-in stinger: `ffmpeg -i key.webp -vf "scale=2560:-1,zoompan=z='1+0.0008*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=120:s=1280x720:fps=24,fade=t=in:st=0:d=0.6" -frames:v 120 -r 24 -c:v libx264 -crf 20 -pix_fmt yuv420p out.mp4`
   - Zoom-out bumper: same, with `z='1.1-0.0008*on'` and `fade=t=out:st=4:d=1`.
3. **Text overlays**: burn correct text in post with ffmpeg `drawtext` (you control spelling/fonts) rather than trusting AI-rendered text — e.g. add "SL Tech Students Weekly" and "Never miss a deadline that matters." over the abstract stingers for a true channel-intro look.

## Pipeline limitations hit during this build
- The video generator outputs a fixed ~10 s / 720p clip; requested ~5 s and ~15 s durations are not honored — intro/outro were therefore produced via the keyframe-animation route instead (documented above), and the promo ships at 10 s rather than 15 s.
- AI-rendered on-screen text can glitch: early frames of the promo show partially clipped/glitch-styled small text ("WEEKLY UPD" clipped at the frame edge). The headline texts ("SL TECH STUDENTS WEEKLY", "NEWSLETTER DASHBOARD", "Never miss a deadline that matters") rendered correctly. Keep AI text short and prominent, or add text in post.
- One trim attempt with `ffmpeg -c copy` silently dropped the video stream (audio-only output); always re-encode (`-c:v libx264`) when trimming AI-generated MP4s.
- A regeneration attempt mid-build failed (upstream 503 on one call, invalid resume id on another); the keyframe-animation fallback was used instead. If you retry, issue fresh prompts rather than resuming old snapshot ids.
