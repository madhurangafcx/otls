  
  ┌───────────────────────┬───────────────────┬─────────────────────────────────────────────────┐   
  │         When          │       Skill       │                       Why                       │ 
  ├───────────────────────┼───────────────────┼─────────────────────────────────────────────────┤   
  │ End of every work     │ /context-save     │ Captures git state + decisions made + remaining │
  │ session               │                   │  work so the next session picks up cleanly      │   
  ├───────────────────────┼───────────────────┼─────────────────────────────────────────────────┤   
  │ Start of every work   │ /context-restore  │ Loads saved state. Especially important if you  │
  │ session               │                   │ cross machines or take a day off.               │   
  ├───────────────────────┼───────────────────┼─────────────────────────────────────────────────┤ 
  │ You hit a bug or      │ /investigate      │ Root-cause investigation discipline. Four-phase │   
  │ unexpected error      │                   │  protocol, no ad-hoc debugging.                 │   
  ├───────────────────────┼───────────────────┼─────────────────────────────────────────────────┤
  │ You want a second     │                   │ Opens a Codex session you can ask anything      │   
  │ opinion on a specific │ /codex consult    │ (e.g., "is this RLS policy exhaustive?").       │   
  │  decision             │                   │ Cheap, informal.                                │
  ├───────────────────────┼───────────────────┼─────────────────────────────────────────────────┤   
  │ After a feature has   │                   │ Full QA loop: finds bugs, fixes, re-verifies,   │ 
  │ UI you can click      │ /qa               │ commits each fix atomically. Use /qa-only for   │
  │                       │                   │ report-only (no fixes).                         │   
  ├───────────────────────┼───────────────────┼─────────────────────────────────────────────────┤
  │ Before merging any    │ /review           │ Diff-scoped adversarial review. Pre-landing     │   
  │ feature PR            │                   │ gate.                                           │   
  ├───────────────────────┼───────────────────┼─────────────────────────────────────────────────┤
  │ Ready to merge a      │                   │ Syncs base, runs tests, reviews diff, bumps     │   
  │ logical unit          │ /ship             │ VERSION, updates CHANGELOG, pushes, creates PR. │   
  │                       │                   │  All of that.                                   │
  ├───────────────────────┼───────────────────┼─────────────────────────────────────────────────┤   
  │ PR is created, time   │ /land-and-deploy  │ Takes over after /ship: waits for CI, merges,   │ 
  │ to merge + deploy     │                   │ deploys, runs /canary post-deploy.              │   
  ├───────────────────────┼───────────────────┼─────────────────────────────────────────────────┤
  │ Immediately after     │                   │ Watches live app for regressions (console       │   
  │ deploy                │ /canary           │ errors, performance, page failures) for the     │   
  │                       │                   │ first hour.                                     │
  ├───────────────────────┼───────────────────┼─────────────────────────────────────────────────┤   
  │ After visual code     │                   │ Designer's-eye QA with before/after             │ 
  │ lands on staging/prod │ /design-review    │ screenshots. Catches visual inconsistency and   │
  │                       │                   │ AI slop.                                        │   
  ├───────────────────────┼───────────────────┼─────────────────────────────────────────────────┤
  │ After a week of work  │ /retro            │ Weekly engineering retrospective. Commit        │   
  │                       │                   │ history, patterns, quality trends.              │ 
  ├───────────────────────┼───────────────────┼─────────────────────────────────────────────────┤   
  │                       │                   │ Updates README, ARCHITECTURE.md, CONTRIBUTING,  │
  │ After a release       │ /document-release │ CHANGELOG to match what shipped. Will ship the  │   
  │                       │                   │ ARCHITECTURE.md handoff doc (CEO review TODO).  │   
  └───────────────────────┴───────────────────┴─────────────────────────────────────────────────┘
                                                                                                    

                                                                         One-time, before Day 1:                                                                         

  - /setup-deploy — configure /land-and-deploy to know your Fly.io platform, health-check endpoint, 
  deploy command. Writes the config to CLAUDE.md.
  - Consider gstack-config set checkpoint_mode continuous if you want auto-commits with WIP: prefix 
  as you work. Local-only by default, won't push unless you turn that on too.                       
   
  Safety skills to enable when touching production later:                                           
                                                                                                  
  - /guard (combines /careful + /freeze) when debugging live systems.                               
  - /careful alone warns before destructive commands (rm -rf, git reset --hard, etc.).            
                                                                                                    
  What not to use right now: anything that assumes code exists. /qa, /design-review, /ship, /review,
   /land-and-deploy, /canary are all post-code. Hold them until Phase 2.                            
                                                                                                                                 