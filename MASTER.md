# Design System: Comic Book Pop-Art

Este é o documento canônico de tokens visuais para a estética de quadrinhos da Era de Bronze. 
Todos os valores hexadecimais, espaçamentos e comportamentos de animação devem derivar deste arquivo.

## 1. Color Palette (Cores)
A paleta usa cores subtrativas (CMYK) altamente saturadas, com uso pesado de preto puro (nanquim) para sombras e bordas.

| Token | Valor Hex | Uso |
| --- | --- | --- |
| `--comic-cyan` | `#22D4F0` | Fundo principal da capa, céu brilhante |
| `--comic-yellow` | `#FFD500` | Títulos, botões primários, onomatopeias |
| `--comic-red` | `#E81C10` | Sombras textuais profundas, botões de ação |
| `--comic-ink` | `#111111` | Bordas grossas, lineart, texto, sombras duras (nanquim) |
| `--comic-paper` | `#FDFBF7` | Fundo de caixas de preço, código de barras (branco levemente envelhecido) |

## 2. Typography (Tipografia)
- **Primary Display (`--font-display`)**: `Bangers` (Google Fonts). Uso exclusivo para Títulos e Onomatopeias.
- **Secondary Display / Bold Text (`--font-action`)**: `Nunito`, Black (900), All-Caps, Italic. Usado nas faixas de cabeçalho e balões auxiliares.
- **Body & Data (`--font-body`)**: `Nunito`, ExtraBold (800). Usado para o selo e caixas de preço.
- **Monospace (`--font-mono`)**: `Courier New` ou `monospace` genérico para código de barras.

## 3. Shadows & Extrusions (Sombras e Profundidade)
Quadrinhos clássicos não usam "blur" (desfoque). Toda sombra é dura (offset sólido).
- **`shadow-extrusion-sm`**: `3px 3px 0 var(--comic-ink)`
- **`shadow-extrusion-md`**: `5px 5px 0 var(--comic-ink)`
- **`shadow-extrusion-lg`**: `8px 8px 0 var(--comic-ink)`
- **`shadow-3d-text`**: `4px 4px 0 var(--comic-ink), 8px 8px 0 var(--comic-red)` (Dá o efeito 3D do título)

## 4. Textures (Texturas)
- **Halftone Base (`--bg-halftone`)**: Radial gradient pattern para emular os pontos de impressão (Benday dots).
- **Sunburst Base (`--bg-sunburst`)**: Conic gradient criando raios saindo do centro.

## 5. Motion Tokens (Animações)
- **`--ease-tear`**: `power4.inOut` (GSAP). Arrancada seca e freio longo.
- **`--duration-tear`**: `1.2s` (rápido, violento, não-elástico).
- **`--rotation-tear`**: `15deg` a `20deg`.
- **`--delay-read`**: `2.5s` (tempo exato para o cérebro processar a capa antes de rasgar).

## 6. Structural Imperfections (Imperfeições Estruturais)
Tudo na estética Comic vintage deve ter uma leve imperfeição (como erro de registro na gráfica).
- A caixa do código de barras deve ser levemente rotacionada (`rotate(-1.5deg)`).
- A caixa de preço deve ter `rotate(2deg)`.
- O título principal deve ter `rotate(-3deg)`.
