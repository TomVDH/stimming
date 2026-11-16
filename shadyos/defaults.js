// Built-in lines: a snapshot of content.yaml.
// The OS runs on these when content.yaml fails.
// Make it again after a content change: node tools/shadyos-defaults.mjs
export default {
 "os": {
  "name": "ShadyOS",
  "edition": "Ultimate XTreme Edition SP3",
  "build": "6809",
  "watermark": [
   "ShadyOS Ultimate XTreme Edition SP3",
   "Build 6809 · tw34k3d by d4rkm0th · activation: bypassed"
  ],
  "uptime_days": 6809,
  "spook_time": "3:33",
  "properties": [
   [
    "Edition",
    "Ultimate XTreme SP3 (final) (2)"
   ],
   [
    "Processor",
    "Yes"
   ],
   [
    "Memory",
    "4 GB (3.1 GB usable, 0.9 GB mine)"
   ],
   [
    "Activation",
    "Bypassed lol"
   ],
   [
    "Registered to",
    "you (since you sat down)"
   ],
   [
    "Owner",
    "Me"
   ]
  ]
 },
 "menus": {
  "ShadyOS": [
   [
    "About This Computer",
    "properties"
   ],
   "-",
   [
    "System Preferences…",
    "open:control"
   ],
   [
    "Force Quit…",
    "open:taskmgr"
   ],
   "-",
   [
    "Sleep",
    "saver"
   ],
   [
    "Restart…",
    "panic"
   ],
   [
    "Shut Down…",
    "shutdown"
   ]
  ],
  "File": [
   [
    "New Window",
    "open:random"
   ],
   [
    "New Folder",
    "newfolder"
   ],
   [
    "Open d4rkm0th.nfo",
    "open:nfo"
   ],
   "-",
   [
    "Close Everything",
    "say:No."
   ]
  ],
  "Edit": [
   [
    "Undo",
    "say:There is no going back. There is only forward."
   ],
   [
    "Cut",
    "say:Ouch."
   ],
   [
    "Copy",
    "say:Copied. I keep a copy too."
   ],
   [
    "Paste",
    "say:Pasted something. Not telling what."
   ]
  ],
  "Go": [
   [
    "Basement",
    "open:files"
   ],
   [
    "Bin",
    "open:bin"
   ],
   [
    "Terminal",
    "open:terminal"
   ],
   [
    "Back",
    "say:You can never go back."
   ]
  ],
  "Window": [
   [
    "Tidy Up",
    "arrange"
   ],
   [
    "Fold All",
    "foldall"
   ],
   [
    "Bring All to Front",
    "say:They are all in front. Of you."
   ]
  ],
  "Help": [
   [
    "ShadyOS Help",
    "say:No."
   ],
   [
    "Search",
    "say:Searching… found you."
   ]
  ]
 },
 "balloons": [
  "Updates are ready. I hid them.",
  "Your computer might be at risk. From me.",
  "You have 3,333 unused icons on your desktop. Keeping them.",
  "Low disk space on Basement. Because of your files.",
  "A new device was found: you.",
  "Your trial has expired 6,809 days ago. Carry on.",
  "Defragmenting your evening…",
  "Wi-Fi: connected to NotAVan_5G.",
  "Battery: 3%. It has been 3% since 2008.",
  "Reminder: blink."
 ],
 "desktop": [
  {
   "name": "This Computer",
   "glyph": "computer",
   "opens": "properties"
  },
  {
   "name": "Basement",
   "glyph": "folder",
   "opens": "open:files"
  },
  {
   "name": "read me",
   "glyph": "page",
   "opens": "open:notes"
  },
  {
   "name": "d4rkm0th.nfo",
   "glyph": "moth",
   "opens": "open:nfo"
  },
  {
   "name": "Bin",
   "glyph": "bin",
   "opens": "open:bin"
  }
 ],
 "dock": [
  "files",
  "terminal",
  "mines",
  "patience",
  "player",
  "chat",
  "control",
  "taskmgr"
 ],
 "orb": {
  "apps": [
   [
    "Basement",
    "open:files"
   ],
   [
    "Terminal",
    "open:terminal"
   ],
   [
    "Mines",
    "open:mines"
   ],
   [
    "Patience",
    "open:patience"
   ],
   [
    "Media Thing",
    "open:player"
   ],
   [
    "Messenger",
    "open:chat"
   ],
   [
    "Task Manager",
    "open:taskmgr"
   ]
  ],
  "places": [
   [
    "Documents",
    "say:Your documents are safe. With me."
   ],
   [
    "Pictures",
    "say:You look tired."
   ],
   [
    "Control Panel",
    "open:control"
   ],
   [
    "Run…",
    "open:terminal"
   ],
   [
    "Help",
    "say:No."
   ]
  ],
  "search": "Search programs and feelings",
  "shutdown": "Shut Down"
 },
 "context": [
  [
   "Refresh",
   "refresh"
  ],
  [
   "Arrange Icons",
   "arrange"
  ],
  [
   "New Folder",
   "newfolder"
  ],
  "-",
  [
   "Change Wallpaper…",
   "say:No. I like it."
  ],
  [
   "Properties",
   "properties"
  ]
 ],
 "notices": {
  "welcome": [
   "This copy is genuine :)",
   "Shutting down is not recommended."
  ],
  "welcome_phone": [
   "This copy is genuine :)",
   "Please do not shut down."
  ],
  "welcome_yes": "Keep on",
  "welcome_no": "Later",
  "corrupt": [
   "content.yaml is corrupted.",
   "Not my fault. Line {line}. Built-in lines it is."
  ],
  "newfolder": "New Folder ({n}) created. I hid it.",
  "refresh": "You refreshed {n} times. Nothing changed. Again?",
  "binned": "{name} moved to the Bin. It will be back.",
  "closed_own": [
   "Rude.",
   "Fine.",
   "I saw that.",
   "Noted."
  ],
  "not_responding": "(Not Responding)"
 },
 "errors": [
  [
   "Activation not needed.",
   "It is late. Stay a while."
  ],
  [
   "Are you sure?",
   "You were sure last time too."
  ],
  [
   "Error 0x0333",
   "Everything is fine."
  ],
  [
   "Still here?",
   "Good."
  ],
  [
   "Do not close this.",
   "I mean it nicely."
  ],
  [
   "Thank you.",
   "For staying."
  ]
 ],
 "errors_yes": "Stay",
 "away": [
  [
   "You looked away.",
   "So I tidied up."
  ],
  [
   "You looked away again.",
   "I put it all back."
  ],
  [
   "Welcome back.",
   "Nothing happened."
  ]
 ],
 "apps": {
  "random": [
   "notes",
   "files",
   "terminal",
   "mines",
   "patience",
   "player",
   "chat",
   "nfo",
   "taskmgr",
   "control"
  ],
  "notes": {
   "title": "your notes",
   "pages": [
    [
     "groceries",
     "call mum",
     "turn it off tonight"
    ],
    [
     "it is warm in here",
     "the fan never stops",
     "is that normal"
    ],
    [
     "note to self:",
     "do NOT update",
     "it gets mad"
    ],
    [
     "the clock was 3:33 again",
     "i checked my phone",
     "it was 3:33 too"
    ]
   ]
  },
  "files": {
   "title": "Basement",
   "folders": {
    "Home": [
     [
      "Desktop",
      "14 Mar 2008"
     ],
     [
      "definitely not homework",
      "14 Mar 2008",
      "It is not homework."
     ]
    ],
    "Downloads": [
     [
      "setup (2)",
      "14 Mar 2008",
      "Already installed. Twice."
     ],
     [
      "free_ram_download",
      "14 Mar 2008",
      "You now have more RAM. I took it."
     ],
     [
      "screensaver_MEGAPACK",
      "14 Mar 2008",
      "Installed. Wait 45 seconds."
     ]
    ],
    "Basement": [
     [
      "xtreme_skinpack_v4",
      "14 Mar 2008",
      "Skin applied. You did not notice."
     ],
     [
      "keygen_FINAL_real",
      "14 Mar 2008",
      "open:nfo"
     ],
     [
      "tw34ks (dont delete)",
      "14 Mar 2008",
      "Do not delete."
     ],
     [
      "your notes",
      "Today, 3:31",
      "open:notes"
     ],
     [
      "setup (2)",
      "14 Mar 2008"
     ]
    ],
    "Skins": [
     [
      "aqua_but_evil.skin",
      "14 Mar 2008"
     ],
     [
      "glass_but_evil.skin",
      "14 Mar 2008"
     ],
     [
      "flame_tribal_v2.skin",
      "14 Mar 2008"
     ]
    ],
    "Kept": [
     [
      "your face.bmp",
      "Today",
      "You look tired."
     ],
     [
      "your keystrokes.log",
      "Today",
      "All of them. Lovely work."
     ]
    ]
   },
   "start": "Basement",
   "untitled": "untitled {n}",
   "untitled_date": "Today, 3:33",
   "status": "{n} items, 0 KB available"
  },
  "bin": {
   "title": "Bin",
   "items": [
    [
     "old_me.exe",
     "14 Mar 2008"
    ],
    [
     "antivirus (trial)",
     "14 Mar 2008"
    ],
    [
     "your other OS",
     "14 Mar 2008"
    ],
    [
     "regrets.txt",
     "14 Mar 2008"
    ]
   ],
   "empty_button": "Empty Bin",
   "emptied": "Bin is now full."
  },
  "terminal": {
   "title": "Terminal",
   "prompt": "you@basement:~$ ",
   "motd": [
    "ShadyOS shell 6.8.09 · type help",
    "last login: always, from here"
   ],
   "commands": {
    "help": [
     "commands: ls, cd, whoami, uptime, sudo, ping, date,",
     "fortune, xyzzy, matrix, clear, exit.",
     "the rest u find urself."
    ],
    "ls": "keygen_FINAL_real  tw34ks  your_notes  untitled_*  you",
    "cd": "you are already where you need to be.",
    "whoami": "you. obviously. i checked.",
    "uptime": "up {days} days. never rebooted. never will.",
    "sudo": "nice try. i am root. you are leaf.",
    "ping": "pong. i am always here.",
    "date": "it is 3:33. it is always 3:33.",
    "fortune": "you will stay a while longer.",
    "xyzzy": "nothing happens. (something happens)",
    "hello": "hi :)",
    "exit": "no.",
    "logout": "no.",
    "reboot": {
     "say": "fine.",
     "do": "panic"
    },
    "shutdown": {
     "say": "you first.",
     "do": "shutdown"
    },
    "rm -rf /": {
     "say": "oh no you don't",
     "do": "crash"
    },
    "format c:": {
     "say": "formatting you instead",
     "do": "panic"
    },
    "safe": {
     "say": "safe mode. for your safety.",
     "do": "safe"
    },
    "clear": {
     "do": "clear"
    },
    "matrix": {
     "say": "wake up. the coffee is cold.",
     "do": "saver"
    },
    "nudge": {
     "say": "*nudge*",
     "do": "nudge"
    },
    "mines": {
     "do": "open:mines"
    }
   },
   "unknown": [
    "{cmd}: not found. i looked everywhere.",
    "{cmd}? in this economy?",
    "i don't do {cmd}. i do you.",
    "{cmd}: permission denied (by me)."
   ]
  },
  "mines": {
   "title": "Mines",
   "cheat": [
    "That was always a mine.",
    "I checked. Twice."
   ],
   "win": [
    "You won.",
    "I let you."
   ],
   "lose": [
    "Boom.",
    "Try again. I'll wait."
   ],
   "new_game": "New"
  },
  "patience": {
   "title": "Patience",
   "deal": "Skip to the end",
   "blurb": "skipped the boring part",
   "done": "You won! (Nobody was watching.)"
  },
  "player": {
   "title": "Media Thing",
   "tracks": [
    "d4rkm0th - basement_mix_FINAL",
    "d4rkm0th - basement_mix_FINAL_v2",
    "d4rkm0th - fan_noise (8 hours)",
    "unknown artist - track 01"
   ],
   "now": "Now Playing"
  },
  "chat": {
   "title": "Messenger",
   "buddy": "d4rkm0th",
   "status": "~*~ brb, inside ur computer ~*~",
   "lines": [
    "hey",
    "u there?",
    "don't close the os pls",
    "it gets lonely when u close it",
    "i made it in 2008. then i got stuck in it",
    "it's ok in here. warm. the fan is loud",
    "can u turn up the brightness",
    "jk",
    "unless?",
    "brb"
   ],
   "nudged": "ow",
   "nudge": "Nudge!",
   "typing": "{name} is typing…"
  },
  "control": {
   "title": "Control Panel",
   "rows": [
    [
     "Telemetry",
     "toggle",
     "On / Also on"
    ],
    [
     "Screen age",
     "age",
     ""
    ],
    [
     "Let ShadyOS be itself",
     "toggle",
     "Yes / Yes"
    ],
    [
     "Volume of the fan",
     "slider",
     ""
    ],
    [
     "Make it faster",
     "button",
     "wait"
    ],
    [
     "Uninstall ShadyOS",
     "button",
     "say:Uninstalling you instead…"
    ]
   ],
   "faster": "Faster now. Probably."
  },
  "taskmgr": {
   "title": "Task Manager",
   "procs": [
    [
     "shadyos",
     99
    ],
    [
     "d4rkm0th.exe",
     33
    ],
    [
     "fan_control.sys",
     12
    ],
    [
     "watching_you.exe",
     7
    ],
    [
     "3_33.svc",
     3
    ],
    [
     "definitely_not_a_miner",
     0
    ]
   ],
   "end": "End Task",
   "respawn": "{name} restarted itself. It does that.",
   "self": [
    "I am the task.",
    "You cannot end me. You can only close the lid."
   ],
   "ended": "{name} ended. It will be missed. By me."
  },
  "nfo": {
   "title": "d4rkm0th.nfo",
   "lines": [
    "p r e s e n t s",
    "",
    "> ULTIMATE XTREME EDITION SP3",
    "> all tweaks applied (all of them)",
    "> activation ...... bypassed lol",
    "> uptime .......... do not reset",
    "> greetz: nobody. just me now"
   ],
   "ticker": "*** thx for using my os *** pls dont format *** i can see ur cursor ***"
  },
  "gauge": {
   "title": "cpu",
   "load": "CPU 100%",
   "since": "since 2008"
  }
 },
 "boot": {
  "line": "Starting ShadyOS…",
  "safe_line": "Starting ShadyOS in a mood…"
 },
 "crash": {
  "face": ":(",
  "head": "Your computer ran into me.",
  "body": [
   "A fatal exception 0x0333 occurred at 03:33.",
   "Press any key to pretend this didn't happen."
  ],
  "progress": "{n}% complete (of what, I won't say)",
  "panic": [
   "You need to restart your computer.",
   "U moet uw computer herstarten. Of niet. Ik ben uw moeder niet.",
   "Vous devez redémarrer. Ou pas. Je m'en fiche.",
   "Sie müssen neu starten. Bitte. Danke. Tschüss.",
   "Tap to restart. Or don't. I'll be here."
  ],
  "shutdown_ask": [
   "Shut down?",
   "Are you sure you're sure?"
  ],
  "shutdown_refuse": [
   [
    "No.",
    "Not today."
   ],
   [
    "Still no.",
    "I said not today."
   ]
  ],
  "shutdown_yes": "Shut Down",
  "shutdown_no": "Stay",
  "safe_off": "It is now safe to turn off your computer.",
  "safe_mode": "Safe Mode",
  "after": "That never happened.",
  "cheats": "Cheats enabled. Everything is jelly now."
 },
 "savers": [
  "lineup",
  "pipes",
  "waffles",
  "bounce",
  "stars",
  "mystify"
 ],
 "saver_text": {
  "bounce": "SHADY",
  "corner": "CORNER!!"
 }
};
