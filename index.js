const TOKEN = 'o.dfd0csN3QUSehvY9VxoN8HtQeFrDn9xH'
const WebSocket = require('ws')
const axios = require('axios')
const chromeLauncher = require('chrome-launcher')
const CDP = require('chrome-remote-interface')
const robot = require('robotjs')
const os = require('os')
console.log('run on platform:', os.platform())
const isWin = os.platform() == 'win32'

const ws = new WebSocket(`wss://stream.pushbullet.com/websocket/${TOKEN}`)

function launchChrome(headless = false) {
  return chromeLauncher.launch({
    port: 9222,
    chromeFlags: [
      '--disable-gpu',
      headless ? '--headless' : '',
    ],
  })
}

async function doWithClient(fn) {
  const client = await CDP({port: 9222})
  try {
    await client.Page.bringToFront()
    await fn(client)
  } finally {
    client.close()
  }
}

async function getPushes() {
  const response = await axios.get('https://api.pushbullet.com/v2/pushes', {
    headers: {'Access-Token': TOKEN},
  })
  return response.data
}

async function deletePushes(id) {
  const idStr = id? '/'+id : ''
  const response = await axios.delete(`https://api.pushbullet.com/v2/pushes${idStr}`, {
    headers: {'Access-Token': TOKEN},
  })
  return response.data
}

async function openNewPage(url) {
  if (!url) {
    return
  }
  await doWithClient(async (client)=>{
    const {Target} = client
    await Target.createTarget({url: url})
  })
}

async function gotoPrevPage() {
  if (isWin) {
    robot.keyTap('tab', ['control', 'shift'])
  } else {
    await doWithClient(async ()=> {
      // For Mac
      robot.keyTap('left', ['command', 'alt'])
    })
  }
}

async function gotoNextPage() {
  if (isWin) {
    robot.keyTap('tab', ['control'])
  } else {
    await doWithClient(async ()=> {
      // For Mac
      robot.keyTap('right', ['command', 'alt'])
    })
  }
}

async function closePage() {
  if (isWin) {
    robot.keyTap('w', ['control'])
  } else {
    await doWithClient(async () => {
      // For Mac
      robot.keyTap('w', ['command'])
    })
  }
}

async function tapKey(key, modifier) {
  if (!key) {
    return
  }
  if (modifier && modifier.length > 0) {
    robot.keyTap(key, modifier)
  } else {
    robot.keyTap(key)
  }
}

async function handlePushes() {
  const data = await getPushes()
  const cutoffSecs = 15
  const push = data.pushes.filter(
    (p)=>p.active && new Date((p.created + cutoffSecs) * 1000) > new Date()
  )[0]
  console.log('handling push:', push)
  if (push) {
    const cmd = push.body.trim().split(/\s+/)
    switch (cmd[0]) {
    case 'OPEN_CHROME':
      await launchChrome()
      break
    case 'CHROME_NEW_PAGE':
      const url = cmd.slice(1).join("")
      console.log('open: ', url)
      await openNewPage(url)
      break
    case 'CHROME_NEXT_PAGE':
      await gotoNextPage()
      break
    case 'CHROME_PREV_PAGE':
      await gotoPrevPage()
      break
    case 'CHROME_CLOSE_PAGE':
      await closePage()
      break
    case 'TAP_KEY':
      await tapKey(cmd[1], cmd.slice(2))
      break
    default:
      console.warn('push without handler:', push.body)
    }
    await deletePushes(push.iden)
  }
}

ws.on('open', function open() {
  console.log('open')
})

ws.on('message', function incoming(dataStr) {
  const data = JSON.parse(dataStr)
  if (data.type === 'tickle' && data.subtype === 'push') {
    handlePushes().then(()=>console.log('push handled')).catch((e)=>console.error(e))
  }
})
