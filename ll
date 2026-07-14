                 ^

Error: EPERM, Permission denied: \\?\C:\Users\HP\AppData\Local\Temp\lighthouse.27422431 '\\?\C:\Users\HP\AppData\Local\Temp\lighthouse.27422431'
    at rmSync (node:fs:1206:18)
    at Launcher.destroyTmp (file:///C:/Users/HP/Downloads/dev/botswana-sites/node_modules/chrome-launcher/dist/chrome-launcher.js:367:9)
    at ChildProcess.<anonymous> (file:///C:/Users/HP/Downloads/dev/botswana-sites/node_modules/chrome-launcher/dist/chrome-launcher.js:328:18)
    at ChildProcess.emit (node:events:509:20)
    at maybeClose (node:internal/child_process:1108:16)
    at ChildProcess._handle.onexit (node:internal/child_process:305:5) {
  errno: 1,
  code: 'EPERM',
  path: '\\\\?\\C:\\Users\\HP\\AppData\\Local\\Temp\\lighthouse.27422431',
  syscall: 'rm'
}

Node.js v25.9.0
PS C:\Users\HP\Downloads\dev\botswana-sites> 