const { generateWAMessageFromContent } = require("@whiskeysockets/baileys")

async function helpCommand(sock, chatId, message) {

const banner = "https://files.catbox.moe/ip70j9.jpg"

function card(title,text){
return {
header:{
title:title,
hasMediaAttachment:true,
imageMessage:{url:banner}
},
body:{text:text},
footer:{text:"BUGFIXED XMD"},
buttons:[]
}
}

const stars = `
│ ★ ✨ | ⭐ | ✨ | ⭐ | ✨
│ ★ ✨ | ⭐ | ✨ | ⭐
│ ★ ✨ | ⭐ | ✨
│ ★ ✨ | ⭐
│ ★ ✨
`

// GENERAL
const GENERAL = `
╭────────────────────⬣
${stars}
│
│ ⭐◇GENERAL◇⭐
│──────────────
│ .help
│ .menu
│ .alive
│ .ping
│ .owner
│ .fact
│ .joke
│ .quote
│ .weather <city>
│ .news
│ .tts <text>
│ .attp <text>
│ .lyrics <song>
│ .8ball <question>
│ .groupinfo
│ .staff
│ .admins
│ .vv
│ .v
│ .trt <text> <lang>
│ .ss <link>
│ .jid
│ .url
│ .quran menu
│ .bugmenu
╰────────────────────⬣
`

// ADMIN
const ADMIN = `
╭────────────────────⬣
${stars}
│
│ ⭐◇ADMIN COMMANDS◇⭐
│──────────────
│ .ban
│ .promote
│ .demote
│ .mute
│ .unmute
│ .delete
│ .del
│ .kick
│ .warnings
│ .warn
│ .antilink
│ .antibadword
│ .clear
│ .tag
│ .tagall
│ .tagnotadmin
│ .hidetag
│ .chatbot
│ .resetlink
│ .antitag
│ .welcome
│ .goodbye
│ .setgdesc
│ .setgname
│ .setgpp
╰────────────────────⬣
`

// OWNER
const OWNER = `
╭────────────────────⬣
${stars}
│
│ ⭐◇OWNER COMMANDS◇⭐
│──────────────
│ .mode
│ .clearsession
│ .antidelete
│ .cleartmp
│ .update
│ .settings
│ .setpp
│ .autoreact
│ .autostatus
│ .autostatus react
│ .autotyping
│ .autorecording
│ .alwaysonline
│ .autoread
│ .anticall
│ .pmblocker
│ .pmblocker setmsg
│ .setmention
│ .mention
╰────────────────────⬣
`

// BUG
const BUG = `
╭────────────────────⬣
${stars}
│
│ ⭐◇BUGFIXED SULEXH◇⭐
│──────────────
│ .pair
│ .user
│ .depair
╰────────────────────⬣
`

// IMAGE
const IMAGE = `
╭────────────────────⬣
${stars}
│
│ ⭐◇IMAGE & STICKER LAB◇⭐
│──────────────
│ .sticker
│ .simage
│ .blur
│ .removebg
│ .remini
│ .crop
│ .meme
│ .take
│ .emojimix
│ .tgsticker
│ .igs
│ .igsc
╰────────────────────⬣
`

// DOWNLOAD
const DOWNLOAD = `
╭────────────────────⬣
${stars}
│
│ ⭐◇DOWNLOADERS◇⭐
│──────────────
│ .play
│ .song
│ .spotify
│ .instagram
│ .facebook
│ .tiktok
│ .video
│ .ytmp4
│ .mediafire
│ .apk
╰────────────────────⬣
`

// FUN
const FUN = `
╭────────────────────⬣
${stars}
│
│ ⭐◇FUN GAME ZONE◇⭐
│──────────────
│ .truth
│ .dare
│ .riddle
│ .rate
│ .ship
│ .fact
│ .quote
╰────────────────────⬣
`

// PREMIUM
const PREMIUM = `
╭────────────────────⬣
${stars}
│
│ ⭐◇PREMIUM / SECRET◇⭐
│──────────────
│ BUG MENU
│ Flood Protection
│ Hidden BUG Engine ON
╰────────────────────⬣
`

const cards = [
card("⭐ GENERAL",GENERAL),
card("⭐ ADMIN",ADMIN),
card("⭐ OWNER",OWNER),
card("⭐ BUGFIXED",BUG),
card("⭐ IMAGE LAB",IMAGE),
card("⭐ DOWNLOADERS",DOWNLOAD),
card("⭐ FUN",FUN),
card("⭐ PREMIUM",PREMIUM)
]

const msg = generateWAMessageFromContent(chatId,{
viewOnceMessage:{
message:{
interactiveMessage:{
body:{text:"⭐ SMD-MINI MENU ⭐"},
carouselMessage:{cards}
}
}
}
},{userJid:sock.user.id})

await sock.relayMessage(chatId,msg.message,{messageId:msg.key.id})

}

module.exports = helpCommand
