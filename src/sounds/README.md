# klappe's built-in sounds

`cue(ctx, { href: "<name>" })` and `section.ts` `music: { href: "<name>" }` take these by name. Each file is made from
scratch with ffmpeg (no samples, so no licence of anyone else), by the command next to it; run them here to make them
again. Mono, 44.1 kHz, MP3 at 96 kbit/s.

| Name | For | Command (`ffmpeg -y -f lavfi -i "<source>" <filters> -ac 1 -b:a 96k <name>.mp3`) |
| --- | --- | --- |
| `whoosh` | a camera flight in (`at: "step"`) | `anoisesrc=d=0.7:c=pink:a=0.5:r=44100` -af highpass=f=300,lowpass=f=3000,volume=3.5,afade=t=in:d=0.35,afade=t=out:st=0.35:d=0.35 |
| `whip` | a whip pan between far scenes | `anoisesrc=d=0.3:c=white:a=0.4:r=44100` -af highpass=f=1500,lowpass=f=7000,afade=t=in:d=0.12,afade=t=out:st=0.12:d=0.18 |
| `hit` | a landing, with impactShake | `aevalsrc=0.6*sin(2*PI*(55+40*exp(-25*t))*t)*exp(-7*t)+0.2*(random(0)*2-1)*exp(-60*t):d=0.6:s=44100`  |
| `pop` | something appears | `aevalsrc=0.5*sin(2*PI*(300*t+3000*t*t))*exp(-35*t):d=0.15:s=44100`  |
| `click` | a small step, a button | `aevalsrc=0.6*(random(0)*2-1)*exp(-250*t):d=0.04:s=44100` -af highpass=f=800 |
| `tick` | a checklist item ticks | `aevalsrc=0.4*sin(2*PI*1800*t)*exp(-60*t):d=0.1:s=44100`  |
| `chime` | success, a target reached | `aevalsrc=0.4*sin(2*PI*659*t)*exp(-5*t)+0.4*gte(t\,0.12)*sin(2*PI*988*(t-0.12))*exp(-5*(t-0.12)):d=1:s=44100`  |
| `fail` | a miss, a check that fails | `aevalsrc=0.4*lt(t\,0.18)*sin(2*PI*330*t)*exp(-8*t)+0.4*gte(t\,0.18)*sin(2*PI*220*(t-0.18))*exp(-5*(t-0.18)):d=0.8:s=44100`  |
| `rise` | build-up before a reveal | `aevalsrc=0.35*sin(2*PI*(200*t+200*t*t))*t/1.5+0.08*(random(0)*2-1)*t/1.5:d=1.5:s=44100` -af lowpass=f=4000,afade=t=out:st=1.4:d=0.1 |
| `shimmer` | a reveal lands | `aevalsrc=0.12*(sin(2*PI*1320*t)+sin(2*PI*1760*t)+sin(2*PI*2093*t))*exp(-2*t)*(1+0.5*sin(2*PI*8*t)):d=1.2:s=44100` -af afade=t=in:d=0.03 |
| `bed-calm` | a quiet music bed, loops (12 s) | `aevalsrc=0.2*(sin(2*PI*220*t)+sin(2*PI*277.5*t)+sin(2*PI*330*t))*(0.8+0.2*sin(2*PI*0.25*t)):d=12:s=44100` -af afade=t=in:d=0.5,afade=t=out:st=11.5:d=0.5 |
| `bed-pulse` | a tense music bed, loops (8 s) | `aevalsrc=0.5*sin(2*PI*55*t)*(0.55+0.45*sin(2*PI*2*t-PI/2))+0.12*sin(2*PI*110*t):d=8:s=44100` -af afade=t=in:d=0.3,afade=t=out:st=7.7:d=0.3 |
