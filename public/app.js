/* Home: a minimal PWA for Tuya devices. No framework, no build step. */
(function () {
  'use strict';

  // Shown in Me > About > Version, newest first. Add an entry with every release.
  const CHANGELOG = [
    {
      "v": "2.52.5",
      "items": [
        "Temperature sensors show their exact reading with one decimal everywhere: the Climate summary (\"19.8–21.5°\" instead of \"20–22°\"), each sensor, the gauges, sensor screens and history, wall tablet mode, and \"Current\" on AC screens. Set temperatures (\"Cooling to 24°\") stay whole numbers."
      ]
    },
    {
      "v": "2.52.4",
      "items": [
        "AC tiles: when the big number is the set temperature (IR remotes without a thermometer), the line underneath says only what the AC is doing (\"Cooling\", \"Heating\", \"Auto\", \"Fan only\", \"Drying\", \"Off\") instead of repeating \"Cooling to 21°\"."
      ]
    },
    {
      "v": "2.52.3",
      "items": [
        "AC tiles: when an AC can't measure the room (for example an IR remote whose blaster has no thermometer), the big number shows the temperature it's set to, coloured by mode, instead of an icon."
      ]
    },
    {
      "v": "2.52.2",
      "items": [
        "AC fan: the Auto button is now a round symbol (a fan with a small A) instead of the word \"Auto\", on AC screens and in wall tablet mode. It's filled while the fan is on automatic, and the label above the slider still says Auto, Low, Medium or High."
      ]
    },
    {
      "v": "2.52.1",
      "items": [
        "Wall tablet mode: AC mode symbols are in one row that slides sideways, like on the AC screen, instead of wrapping onto two lines. The next symbol fades in at the edge, the selected mode stays in view, and the row keeps its position after a tap."
      ]
    },
    {
      "v": "2.52.0",
      "items": [
        "Air conditioner tiles now look like the Home app's thermostat tile: twice as tall, with the room temperature in large numbers at the top, coloured by what the AC is doing (blue cooling, orange heating, blue-to-orange auto, teal fan or dry, grey off), and the name and status (\"Cooling to 24°\") at the bottom. Tap the tile to open the thermostat. ACs with no thermometer show their icon at the top instead. Smaller tiles fill in beside it."
      ]
    },
    {
      "v": "2.50.2",
      "items": [
        "AC screens: the mode symbols stay full size, and the row slides left and right when they don't all fit (IR ACs on phones), with a soft fade at the edges. The row keeps its position after a tap, and the selected mode is always in view."
      ]
    },
    {
      "v": "2.50.1",
      "items": [
        "Fixed: on IR AC screens the six mode buttons were squeezed into ovals. They now stay round and share the row evenly."
      ]
    },
    {
      "v": "2.50.0",
      "items": [
        "Air conditioner screens (phone and tablet panel) now use the thermostat from wall tablet mode: \"Current\" and humidity at the top, a large arc you drag to set the temperature, coloured by mode, and the modes as symbols (power, snowflake, sun, auto, fan, droplet). IR ACs keep the fan slider. The device tiles on Home are unchanged.",
        "Fixed: changing an AC's mode and then quickly setting the temperature could jump back to the old temperature. A status refresh no longer overwrites a change that's still being sent (this also applies to + / − buttons and sliders)."
      ]
    },
    {
      "v": "2.49.1",
      "items": [
        "Fixed: repeating schedules from the Tuya app (like 07:00 on weekdays) were shown as one-time schedules. Tuya also stores a date on repeating schedules. They now show their days, and saving keeps them repeating.",
        "Automations: sunrise/sunset and weather conditions from the Tuya app now show what they are (\"At sunset\", \"Outside above 30°\", \"Weather turns rainy\") with their city, instead of \"Weather condition from the Tuya app\". You can switch between sunrise and sunset, and change outside temperature, weather and humidity conditions.",
        "Automations: new Sunrise / sunset button under When. It uses the same city as your other weather automations, or Tuya's city for your home's location."
      ]
    },
    {
      "v": "2.49.0",
      "items": [
        "Automations: one-time schedules made in the Tuya app now show their date and time (\"Once, Tue, Nov 10 at 7:30 AM\") instead of \"One-off schedule from the Tuya app\", and you can edit them. Each time under When has a Repeat / Once switch: Repeat picks days of the week, Once picks a date. If the date has passed, the card says so."
      ]
    },
    {
      "v": "2.48.1",
      "items": [
        "Android, Windows and other devices now use Inter, a free font made to match Apple's San Francisco, so the app looks the same everywhere. Apple devices keep the real San Francisco. Inter comes with the app (about 30 KB per weight), is only downloaded on devices that need it, and works offline."
      ]
    },
    {
      "v": "2.48.0",
      "items": [
        "Uses Apple's own font, San Francisco (the iOS system font), on iPhone, iPad and Mac, instead of Outfit. Other devices use their own system font. The app no longer downloads a font from Google, so the first load is a little faster."
      ]
    },
    {
      "v": "2.47.0",
      "items": [
        "Colour lights: iOS 26 colour controls. A colour wheel you drag (colour around the edge, paler towards the middle), preset colours with a ring on the selected one, and a thick brightness bar filled with the current colour. White / Color is now a capsule switch with a sliding thumb.",
        "Fixed: since 2.44.0, opening a light in White mode could fail because the wall tablet AC dial reused a name from the brightness dial."
      ]
    },
    {
      "v": "2.46.0",
      "items": [
        "Wall tablet mode: a slim row of room pills (All rooms, Living room, Bedroom...) sits above the tiles. Tap one to show only that room's devices, ACs and climate readings. The tablet remembers the choice, and it doesn't change the room on the Home tab."
      ]
    },
    {
      "v": "2.45.0",
      "items": [
        "Wall tablet mode: AC modes are now round symbols instead of words: power (Off), snowflake (Cool), sun (Heat), A (Auto), fan (Fan) and droplet (Dry). The selected one fills with its colour, and its name shows underneath."
      ]
    },
    {
      "v": "2.44.1",
      "items": [
        "Wall tablet mode: IR AC remote tiles are now the same size as other AC tiles. Their modes sit in two columns above the fan slider."
      ]
    },
    {
      "v": "2.44.0",
      "items": [
        "Wall tablet mode: the AC widget now looks like the Home app's thermostat: the current temperature and humidity under its name, a large arc you drag to set the temperature (blue for cooling, orange for heating), \"Set to\" in the middle, and a mode menu with a check mark (Off, Cool, Heat, Auto...). IR ACs keep the fan slider."
      ]
    },
    {
      "v": "2.43.2",
      "items": [
        "Wall tablet mode uses compact device tiles too (round icon on the left, name and state beside it), so many more devices fit on screen. Tap a tile to switch it on or off."
      ]
    },
    {
      "v": "2.43.1",
      "items": [
        "Smoother switches: rocker switches, toggle switches and tile icons now slide (and change colour) in one smooth motion with a gentle spring, instead of jumping or restarting when the screen updates."
      ]
    },
    {
      "v": "2.43.0",
      "items": [
        "Tidier switch-group screen: the list under the rockers is now just \"Switch names\" (tap one to rename it), without repeating the on/off switches.",
        "Faster cold starts: with the database connected, the server remembers your homes, rooms, which devices are in which room and your IR remotes (IDs and names only), so opening the app after a quiet spell asks Tuya for half as much. In tests the first load went from 0.7 s to 0.3 s. New devices still appear straight away, and Refresh now forgets the remembered details."
      ]
    },
    {
      "v": "2.42.0",
      "items": [
        "Devices with several switches (2- and 3-gang wall switches, power strips) now show a rocker for each switch, like the Home app: \"1 On • 2 Off\" at the top, two per row with the name under each, and a Turn all on/off button. Tap a rocker or swipe it up or down. The list below still lets you rename each switch.",
        "Rocker switches now light up yellow with a white icon when on, like the Home app."
      ]
    },
    {
      "v": "2.41.2",
      "items": [
        "Scroll bars are hidden throughout the app; scrolling works as before."
      ]
    },
    {
      "v": "2.41.1",
      "items": [
        "The Arrange button above the devices is now an icon (two arrows); it turns into a checkmark while you're arranging."
      ]
    },
    {
      "v": "2.41.0",
      "items": [
        "More compact device tiles, like the Home app: a short tile with the round icon on the left and the name and state beside it, so about twice as many fit on screen. Tap the icon to turn a device on or off, or the name for its full controls."
      ]
    },
    {
      "v": "2.40.0",
      "items": [
        "Device cards on the home screen now match the wall tablet: glass when off, and bright white with a yellow round icon when on."
      ]
    },
    {
      "v": "2.39.1",
      "items": [
        "Wall tablet mode shows temperature and humidity the same way: Climate and Humidity summary capsules above the scenes (tap to see each sensor when there are several)."
      ]
    },
    {
      "v": "2.39.0",
      "items": [
        "Temperature and humidity on the home screen now look like the Home app's summaries: capsule buttons at the top with an icon, \"Climate\" or \"Humidity\" and the reading (a range like 24–26° when you have several sensors). Tap one to see each sensor, or its history if you only have one."
      ]
    },
    {
      "v": "2.38.0",
      "items": [
        "Wall tablet mode redesigned in the iOS 26 style. A Lock Screen-style clock sits at the top, with the date and weather above it. Scenes are capsules like the Home app. Below is a grid of glass widgets: sensors with gauges, large AC widgets, and Control Center-style device tiles that turn bright when on.",
        "At night (22:00–06:00) wall tablet mode now works like StandBy: only a dim red clock stays on a black screen. Tap anywhere to bring everything back for a minute."
      ]
    },
    {
      "v": "2.37.1",
      "items": [
        "On iPhone the background now runs all the way to the top, behind the clock and battery, instead of a black bar. If the bar is still there after updating, remove Home from the home screen and add it again (iOS reads this setting when the app is added)."
      ]
    },
    {
      "v": "2.37.0",
      "items": [
        "Opening the app is faster: the server now starts all its Tuya requests side by side instead of in four or five waves, gets the Tuya sign-in ready while it checks your session, and looks up IR remotes alongside everything else. In tests with typical cross-region delays the first load went from 1.2 s to 0.7 s.",
        "Me → Settings shows how long the last full update took. If it's slow, see \"Speed: put the server next to Tuya\" in the README: choosing a Vercel function region near your Tuya data center is the biggest speed-up."
      ]
    },
    {
      "v": "2.36.0",
      "items": [
        "Fewer Tuya API calls: open screens share one device-status request on the server, Refresh now can skip the cache at most every 15 seconds, and the app checks less often when left idle (every 30 s), in wall tablet mode (every 15 s) and when the tablet is dimmed at night (every minute). It catches up as soon as you touch it.",
        "Timeouts: a Tuya request gives up after 8 seconds and the app's own requests after 20, with a clear message, instead of spinning.",
        "The Android back gesture (or back button) in the scene and automation editor now asks before throwing away unsaved changes.",
        "Faster start: the app shows your devices from last time straight away (with \"Updating…\") while it fetches fresh states. Smaller icons and backgrounds, the font no longer delays the first paint, and images are cached longer."
      ]
    },
    {
      "v": "2.35.2",
      "items": [
        "Wall tablet mode: the AC fan speed is a slider with an Auto button, the same as on the AC screen."
      ]
    },
    {
      "v": "2.35.1",
      "items": [
        "Wall tablet mode now has an Air conditioners section: each AC gets a card with power, a big target temperature with − and + buttons, mode buttons, and fan speed for IR remote ACs. ACs no longer appear as plain on/off tiles there."
      ]
    },
    {
      "v": "2.35.0",
      "items": [
        "A design pass following Apple's Liquid Glass guidance. Glass is now kept for things that float above the content (tab bar, sidebar, back buttons, Save bar, dialogs), while device cards, lists and panels sit on a calmer, mostly solid surface that's easier to read.",
        "The phone tab bar shrinks while you scroll down and comes back when you scroll up. Lists fade softly at their edges, and buttons spring and light up when pressed.",
        "Rounder, matching corners (inner shapes follow their container) and section labels in normal capitalisation instead of ALL CAPS. The app follows the Reduce Transparency, Increase Contrast and Reduce Motion settings."
      ]
    },
    {
      "v": "2.34.0",
      "items": [
        "Arrange your device cards: tap Arrange above the cards, drag a card by its handle (or use the arrow keys), then tap Done. The order is saved for each home and syncs across your devices when sync is on.",
        "Wall tablet mode (Me → Wall tablet mode): a full-screen dashboard with a big clock, weather, sensor gauges, scenes and your first 12 devices. It keeps the screen awake where the browser allows, dims itself from 22:00 to 06:00 (tap to wake), and you press and hold the ✕ to leave."
      ]
    },
    {
      "v": "2.33.0",
      "items": [
        "Plain on/off devices (plugs, switches and lamps without dimming) now have a big rocker switch: the knob sits at the bottom when off and slides up, glowing, when on. Tap it, or swipe it up or down. Power strips keep the all-outlets button."
      ]
    },
    {
      "v": "2.32.0",
      "items": [
        "Temperature and humidity sensors on the home screen now show round gauges with an icon, the label and the reading. The dot on each gauge marks the value (0–40° for temperature, 0–100% for humidity). Tap one for its history, as before."
      ]
    },
    {
      "v": "2.31.1",
      "items": [
        "The AC and thermostat screen no longer shows the device photo above the temperature dial. The photo still shows on the device card and in the header."
      ]
    },
    {
      "v": "2.31.0",
      "items": [
        "New app logo: a little house on the horizon at sunrise, on the home screen icon, the sign-in screen and the tablet sidebar. Installed apps may keep the old home screen icon until you reinstall."
      ]
    },
    {
      "v": "2.30.0",
      "items": [
        "Scenes and automations explain themselves: scene cards say what they do (\"Ceiling light off · Floor lamp on, 29%\") and automations show when and what (\"Every day at 7:00 PM → Porch light on\").",
        "Scene and automation editor: Save stays at the bottom of the screen while you scroll, it shows when there are unsaved changes, and it asks before throwing them away. Duplicate a scene or automation to start a copy.",
        "A tidier Me tab: your profile, then Home, Activity, People and Device icons. Appearance (background, weather units, distance), Settings (live updates, PIN, sync) and About each have their own page."
      ]
    },
    {
      "v": "2.29.0",
      "items": [
        "AC fan speed is now a slider (Low, Medium, High) with an Auto button beside it. The slider is dimmed while the fan is on Auto."
      ]
    },
    {
      "v": "2.28.0",
      "items": [
        "New AC and thermostat screen: a large room temperature on the left (with an arrow when it's warming or cooling) and a dial on the right. Drag the dial up for warmer or down for cooler, tap above or below the pointer to change by one degree, or use the arrow keys. IR remotes show the blaster's own thermometer when it has one."
      ]
    },
    {
      "v": "2.27.0",
      "items": [
        "More device photos: a white air conditioner, a paper lantern lamp and an orange star lamp, in Me > Device icons."
      ]
    },
    {
      "v": "2.26.0",
      "items": [
        "Device photos: choose a black desk lamp, white column lamp, orange donut lamp or blue table lamp in Me > Device icons. The photo shows on the device card and its screen, with a warm glow (in the light's colour) when it is on and a muted look when it is off."
      ]
    },
    {
      "v": "2.25.0",
      "items": [
        "Timers: on a device's screen, choose Turn off (or on) in 15 min, 30 min, 1 hour or 2 hours. Upcoming timers show with a Cancel button.",
        "Sensor history: tap a temperature or humidity reading for charts of the last 24 hours or 7 days, with low, average and high."
      ]
    },
    {
      "v": "2.24.0",
      "items": [
        "Five more backgrounds: Ember, Tide, Mist, Halftone and Dusk.",
        "Me > Background is now a picker with previews. Photo backgrounds get a light dimming layer so text stays readable."
      ]
    },
    {
      "v": "2.23.0",
      "items": [
        "Optional backgrounds: choose Aura (a soft colour glow on black) in Me > Background. The app switches to its dark look so everything stays readable."
      ]
    },
    {
      "v": "2.22.0",
      "items": [
        "Redesigned to follow Apple's Liquid Glass guidelines: glass only on the navigation layer (tab bar, side rail, back buttons, alerts), standard materials for cards and lists, a plain system background, system label colours, a quiet selected-tab fill, and toggles that turn glassy while pressed. Respects Reduce Transparency and Increase Contrast."
      ]
    },
    {
      "v": "2.21.1",
      "items": [
        "Calmer glass: a softer, more neutral backdrop, a subtler sheen and quieter edges, keeping the depth."
      ]
    },
    {
      "v": "2.21.0",
      "items": [
        "Stronger liquid glass: clearer surfaces with more blur, a light-catching sheen and brighter edges, over a more colourful backdrop. Turn on Reduce Transparency on your phone for solid surfaces."
      ]
    },
    {
      "v": "2.20.1",
      "items": [
        "Neater People list: name and Remove on one line, role and home menus side by side at equal width."
      ]
    },
    {
      "v": "2.20.0",
      "items": [
        "IR remotes in scenes and automations: set an IR air conditioner's power, temperature, mode and fan, or press any button on a TV or other IR remote."
      ]
    },
    {
      "v": "2.19.0",
      "items": [
        "Activity log in Me: see who turned what on or off, ran scenes, switched automations, edited scenes and automations, changed people, and signed in, for the last 30 days. Members only see their own homes."
      ]
    },
    {
      "v": "2.18.0",
      "items": [
        "Optional distance from home under the greeting (\"You're 12 km from home\"), turned on in Me. Your location stays on your phone.",
        "Pinch and double-tap zoom are turned off."
      ]
    },
    {
      "v": "2.17.1",
      "items": [
        "Tidier Me tab: removed the explanatory notes under Device icons and People."
      ]
    },
    {
      "v": "2.17.0",
      "items": [
        "23 new device icons: column, desk, table, pendant and wall lamps, spotlight, fairy lights, lantern, star light, night light, Christmas tree, air purifier, humidifier, water heater, coffee maker, washing machine, fridge, robot vacuum, lock, doorbell, garage, plant and pet feeder."
      ]
    },
    {
      "v": "2.16.0",
      "items": [
        "What's new: this changelog, under Me > About > Version. After an update, a message offers to show what changed."
      ]
    },
    {
      "v": "2.15.1",
      "items": [
        "IR air conditioners and other IR remotes show their brand (for example Bedroom, Daikin)."
      ]
    },
    {
      "v": "2.15.0",
      "items": [
        "Updates install themselves: the app reloads once at a quiet moment instead of needing to be reopened.",
        "Live updates no longer pause after touching a slider without moving it.",
        "No more zooming in on iPhone when tapping menus and fields.",
        "No double-tap zoom or text selection when tapping cards and switches.",
        "Swipe back only runs in the installed app, so it no longer clashes with Safari's own back swipe.",
        "Faster switches and live updates when people and sync are set up."
      ]
    },
    {
      "v": "2.14.2",
      "items": [
        "The greeting no longer slips under the iPhone status bar blur."
      ]
    },
    {
      "v": "2.14.1",
      "items": [
        "Energy history works for many more plugs: it falls back to the plug's energy reports, or estimates from its wattage.",
        "If history still isn't available, the Energy section explains why and offers Try again."
      ]
    },
    {
      "v": "2.14.0",
      "items": [
        "Switches pulse gently until Tuya confirms a command.",
        "Offline devices show a clear red Offline tag.",
        "Swipe from the left edge to go back (installed app on phones).",
        "Gentle slide and fade transitions between screens."
      ]
    },
    {
      "v": "2.13.1",
      "items": [
        "The first row of device cards no longer looks cut off under the header.",
        "The device count next to Devices is easier to read in dark mode."
      ]
    },
    {
      "v": "2.13.0",
      "items": [
        "Pull down to refresh on any page.",
        "Energy for plugs that measure power: live watts on the card, plus volts, amps and a 7-day chart on the plug's screen."
      ]
    },
    {
      "v": "2.12.0",
      "items": [
        "A more compact top section on phones: weather beside the greeting, smaller room tiles and readings."
      ]
    },
    {
      "v": "2.11.0",
      "items": [
        "The bottom navigation shows icons only."
      ]
    },
    {
      "v": "2.10.0",
      "items": [
        "The top of the Devices page stays put; only the device cards scroll."
      ]
    },
    {
      "v": "2.9.0",
      "items": [
        "All off is a simple power button.",
        "Device icons moved to Me > Device icons."
      ]
    },
    {
      "v": "2.8.0",
      "items": [
        "Create, edit and delete automations: times, device triggers and sensor thresholds, then devices, waits or scenes."
      ]
    },
    {
      "v": "2.7.0",
      "items": [
        "A Liquid Glass look: frosted surfaces, a colourful backdrop and a floating tab bar."
      ]
    },
    {
      "v": "2.6.1",
      "items": [
        "Weather shows in Celsius by default."
      ]
    },
    {
      "v": "2.6.0",
      "items": [
        "The greeting says Hi with your name, plus the current weather at your home."
      ]
    },
    {
      "v": "2.5.0",
      "items": [
        "Admins can limit a member to one home."
      ]
    },
    {
      "v": "2.4.0",
      "items": [
        "Sync and people now use a Neon database."
      ]
    },
    {
      "v": "2.3.1",
      "items": [
        "Fits Vercel's free plan: all server endpoints run through one function."
      ]
    },
    {
      "v": "2.3.0",
      "items": [
        "All off asks for confirmation before turning everything off."
      ]
    },
    {
      "v": "2.2.0",
      "items": [
        "A new design: greeting header, room tiles, picture-style cards and a brightness dial."
      ]
    },
    {
      "v": "2.1.0",
      "items": [
        "Device states update about every 4 seconds, with a speed setting in Me."
      ]
    },
    {
      "v": "2.0.0",
      "items": [
        "Colour control for RGB lights.",
        "All off for a room or the whole home.",
        "People: separate passwords for family members, with admin and member roles.",
        "Icons sync across devices."
      ]
    },
    {
      "v": "1.7.0",
      "items": [
        "Temperature and humidity sensors show as readings above your devices."
      ]
    },
    {
      "v": "1.6.0",
      "items": [
        "Create, edit and delete tap-to-run scenes."
      ]
    },
    {
      "v": "1.5.0",
      "items": [
        "More reliable IR air conditioner control, with a fallback when the IR blaster can't be found."
      ]
    },
    {
      "v": "1.4.0",
      "items": [
        "IR blasters: each remote you set up (AC, TV...) appears as its own device."
      ]
    },
    {
      "v": "1.3.0",
      "items": [
        "Unlock the app with a PIN instead of the password."
      ]
    },
    {
      "v": "1.2.0",
      "items": [
        "Switching homes shows only that home's devices.",
        "Choose a custom icon for any device."
      ]
    },
    {
      "v": "1.1.0",
      "items": [
        "Multi-outlet devices: control each outlet or all at once, and rename outlets."
      ]
    },
    {
      "v": "1.0.0",
      "items": [
        "First version: devices, rooms, scenes, automation switches, phone and tablet layouts, demo mode."
      ]
    }
  ];
  const APP_VERSION = CHANGELOG[0].v;

  // ---------- Storage (guarded: private mode can throw) ----------
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };

  // ---------- State ----------
  const S = {
    mode: new URLSearchParams(location.search).has('demo') ? 'demo' : (store.get('mode') || 'live'),
    key: store.get('appKey') || '',
    homeId: store.get('homeId') || '',
    kRoom: store.get('kRoom') || 'All',  // wall tablet mode's room (separate from the Home tab)
    data: null,
    loading: false,
    gate: null,          // null | 'login' | 'setup'
    gateError: '',
    room: 'All',
    specs: {},           // deviceId -> { codes, writable } | 'loading'
    sceneState: {},      // sceneId -> 'running' | 'done'
    dragging: false,
    renaming: null,
    iconPicking: null,
    pinEntry: '',        // digits typed on the keypad
    pinStage: 'enter',   // PIN setup: 'enter' then 'confirm'
    pinFirst: '',
    pinError: '',
    pinBusy: false,
    irKeys: {},          // remoteId -> { keys, categoryId } | 'loading' | { error }
    irSent: {},
    irSpecs: {},         // deviceId -> standard IR instructions for scenes/automations
    editor: null,        // scene being created or edited
    me: null,            // signed-in user { id, name, role, owner }
    sync: false,         // shared storage set up on the server
    users: null,         // admin's user list (null = not loaded)
    userForm: { name: '', password: '', role: 'member', error: '', busy: false, open: false },
    pwForm: { current: '', password: '', error: '', busy: false, open: false },
    allOffArmed: 0,      // time the "All off" button was armed
    pollMs: Number(store.get('pollMs')) || 4000,  // live status interval
    touched: {},
    pending: {},         // deviceId -> number of commands still on their way
    weather: null,
    showDistance: store.get('showDistance') === '1',  // "You're 12 km from home" (location stays on this phone)
    myPos: null,
    timers: {},          // deviceId -> { list, at } | 'loading' | { error }
    history: null,       // { id, hours, data, loading, error }
    histHours: 24,
    bg: store.get('bg') || 'system',  // optional background: 'system' or 'aura'
    activity: null,      // { homeId, entries, more, loading, error }
    energy: {},          // deviceId -> { at, available, today, week, days, total } | 'loading'       // { homeId, at, available, temp, code, isDay, unit } for the greeting
    tempUnit: store.get('tempUnit') || 'c',  // Celsius unless changed in Me         // deviceId -> time of the last local command (avoid flicker)          // remoteId + key -> true briefly after a button is sent   // deviceId whose icon picker is open
    order: (() => { try { return JSON.parse(store.get('order') || '{}') || {}; } catch (e) { return {}; } })(),  // homeId -> [deviceId]
    reorder: false,       // true while arranging device cards
    icons: readIcons(),  // deviceId -> icon key, saved on this device      // { id, code } while an outlet name is being edited
    installPrompt: null
  };
  if (S.mode === 'demo') store.set('mode', 'demo');

  function readIcons() {
    try { return JSON.parse(store.get('icons') || '{}') || {}; } catch (e) { return {}; }
  }
  function saveIcons() { store.set('icons', JSON.stringify(S.icons)); }

  // ---------- PIN lock ----------
  // With a PIN set, the app password is stored encrypted (AES-GCM) with a key derived
  // from the PIN (PBKDF2). Without the PIN the stored password can't be read.
  const PIN_MIN = 4, PIN_MAX = 8, PIN_TRIES = 5, AUTO_LOCK_MS = 5 * 60 * 1000;
  const te = new TextEncoder(), td = new TextDecoder();
  const toB64 = (buf) => btoa(String.fromCharCode.apply(null, new Uint8Array(buf)));
  const fromB64 = (str) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
  function readVault() {
    try { const v = JSON.parse(store.get('pinVault') || 'null'); return v && v.ct ? v : null; } catch (e) { return null; }
  }
  async function pinKey(pin, salt) {
    const base = await crypto.subtle.importKey('raw', te.encode(pin), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function sealVault(pin, secret) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await pinKey(pin, salt), te.encode(secret));
    return { v: 1, len: pin.length, salt: toB64(salt), iv: toB64(iv), ct: toB64(ct) };
  }
  async function openVault(pin, vault) {
    try {
      const key = await pinKey(pin, fromB64(vault.salt));
      const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(vault.iv) }, key, fromB64(vault.ct));
      return td.decode(pt);
    } catch (e) { return null; } // wrong PIN: the authentication tag doesn't match
  }
  function wipeVault() { store.del('pinVault'); store.del('pinFails'); }
  const pinSupported = !!(window.crypto && crypto.subtle && window.isSecureContext);

  const wide = window.matchMedia('(min-width: 900px)');

  // ---------- Helpers ----------
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const $ = (sel, root) => (root || document).querySelector(sel);

  function toast(msg, action, ms) {
    const el = $('#toast');
    el.textContent = msg;
    el.onclick = action || null;
    el.classList.toggle('actionable', !!action);
    el.setAttribute('role', action ? 'button' : 'status');
    el.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { el.classList.remove('show', 'actionable'); el.onclick = null; }, ms || 2600);
  }

  // ---------- Routing (#devices, #scenes, #me, #device/<id>) ----------
  function route() {
    const h = location.hash.replace(/^#/, '');
    if (h.startsWith('device/')) return { view: 'device', id: decodeURIComponent(h.slice(7)) };
    if (h.startsWith('scene/')) return { view: 'scene-edit', id: decodeURIComponent(h.slice(6)) };
    if (h.startsWith('auto/')) return { view: 'auto-edit', id: decodeURIComponent(h.slice(5)) };
    if (h === 'icons') return { view: 'icons' };
    if (h === 'changelog') return { view: 'changelog' };
    if (h === 'activity') return { view: 'activity' };
    if (h === 'backgrounds') return { view: 'backgrounds' };
    if (ME_PAGES.includes(h)) return { view: h };
    if (h === 'kiosk') return { view: 'kiosk' };
    if (h.startsWith('history/')) return { view: 'history', id: decodeURIComponent(h.slice(8)) };
    if (h === 'scenes' || h === 'me') return { view: h };
    return { view: 'devices' };
  }
  const ME_PAGES = ['people', 'appearance', 'settings', 'about', 'attention'];
  function inEditor() { const v = route().view; return v === 'scene-edit' || v === 'auto-edit'; }
  function go(hash) {
    if (location.hash === '#' + hash) render(); else location.hash = hash;
  }

  // ---------- API ----------
  async function api(path, opts) {
    opts = opts || {};
    if (S.mode === 'demo') return Demo.handle(path, opts);
    const headers = { 'x-app-key': S.key };
    if (opts.body) headers['Content-Type'] = 'application/json';
    let res;
    try {
      // All endpoints go through one serverless function: /api/router?r=<name>&<params>
      const q = path.indexOf('?');
      const url = '/api/router?r=' + (q < 0 ? path : path.slice(0, q) + '&' + path.slice(q + 1));
      // A request that hangs (weak Wi-Fi, a slow cold start) gives up after 20 s instead of spinning forever.
      res = await fetch(url, {
        method: opts.method || 'GET',
        headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(20000) : undefined
      });
    } catch (e) {
      if (e && (e.name === 'TimeoutError' || e.name === 'AbortError')) {
        const err = new Error('Your server took too long to answer. Try again.'); err.code = 'timeout'; throw err;
      }
      const err = new Error(navigator.onLine ? 'Could not reach your server.' : 'You are offline.');
      err.code = 'network';
      throw err;
    }
    let json = {};
    try { json = await res.json(); } catch (e) { /* non-JSON */ }
    if (!res.ok) {
      const err = new Error(json.error || 'Request failed (HTTP ' + res.status + ').');
      err.code = json.code || (res.status === 401 ? 'unauthorized' : 'error');
      err.status = res.status;
      throw err;
    }
    return json;
  }

  // Last-known state, so the app shows your devices instantly on open and then updates them.
  // Not kept when a PIN protects the app (the PIN screen should reveal nothing).
  const SNAP_MAX_AGE = 24 * 3600 * 1000;
  function saveSnapshot(data) {
    if (S.mode !== 'live' || readVault()) { store.del('snap'); return; }
    try { store.set('snap', JSON.stringify({ at: Date.now(), data })); } catch (e) { /* storage full: skip */ }
  }
  function loadSnapshot() {
    try {
      const snap = JSON.parse(store.get('snap') || 'null');
      if (!snap || !snap.data || Date.now() - snap.at > SNAP_MAX_AGE) return null;
      return Object.assign(snap.data, { stale: true, warnings: [] });
    } catch (e) { return null; }
  }

  async function refresh(opts) {
    opts = opts || {};
    if (S.mode === 'live' && !S.key) { S.gate = 'login'; render(); return; }
    if (S.loading) { S.refreshAgain = true; return; }
    S.loading = true;
    if (!S.data) render();
    try {
      const params = [];
      if (S.homeId) params.push('homeId=' + encodeURIComponent(S.homeId));
      if (opts.fresh) params.push('fresh=1');
      const t0 = performance.now();
      const data = await api('state' + (params.length ? '?' + params.join('&') : ''));
      S.loadMs = Math.round(performance.now() - t0);
      lastFull = Date.now();
      S.data = data;
      saveSnapshot(data);
      S.gate = null;
      if (data.me) S.me = data.me;
      S.sync = !!data.sync;
      if (data.settings && data.settings.icons) { S.icons = Object.assign({}, data.settings.icons); saveIcons(); }
      if (data.settings && data.settings.order && data.homeId && Array.isArray(data.settings.order[data.homeId])) {
        S.order = Object.assign({}, S.order, { [data.homeId]: data.settings.order[data.homeId] }); store.set('order', JSON.stringify(S.order));
      }
      if (data.homeId) { S.homeId = data.homeId; store.set('homeId', data.homeId); }
      loadWeather();
      prefetchLightSpecs();
    } catch (e) {
      if (e.code === 'unauthorized') {
        const hadPin = !!readVault();
        wipeVault();
        S.gate = 'login';
        S.gateError = hadPin
          ? 'Your app password was changed on the server. Enter the new one, then set up your PIN again.'
          : 'Please sign in again.';
        S.key = ''; store.del('appKey');
      } else if (e.code === 'not_configured') {
        S.gate = 'setup'; S.gateError = e.message;
      } else if (!opts.silent) {
        toast(e.message);
      }
    } finally {
      S.loading = false;
      const typing = document.activeElement && /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName) && document.activeElement.type !== 'range';
      if (!S.dragging && !S.renaming && !typing && !(S.editor && inEditor())) render();
      if (S.refreshAgain) { S.refreshAgain = false; refresh({ silent: true }); }
    }
  }

  // Lights need their spec to convert brightness into a percentage;
  // multi-outlet devices need it for their custom outlet names.
  function prefetchLightSpecs() {
    if (!S.data) return;
    for (const d of S.data.devices) {
      if ((kindOf(d) === 'light' || kindOf(d) === 'multi' || isReadingDevice(d) || hasEnergy(d)) && !S.specs[d.id] && d.online) loadSpec(d.id, true);
    }
  }
  async function loadSpec(id, quiet) {
    if (S.specs[id]) return S.specs[id];
    S.specs[id] = 'loading';
    try {
      S.specs[id] = await api('spec?deviceId=' + encodeURIComponent(id));
    } catch (e) {
      S.specs[id] = { codes: {}, writable: null, failed: true };
      if (!quiet) toast('Could not load controls: ' + e.message);
    }
    if (!S.dragging && !S.renaming) render();
    return S.specs[id];
  }

  // ---------- Device model ----------
  const KINDS = {
    light: ['dj', 'dd', 'fwd', 'xdd', 'dc', 'tgq', 'gyd', 'tyndj', 'fsd', 'sxd'],
    plug: ['kg', 'cz', 'pc', 'tdq', 'dlq', 'qjdcz'],
    climate: ['kt', 'wk', 'qn', 'ktkzq', 'wkf', 'rs'],
    cover: ['cl', 'clkg', 'mc'],
    fan: ['fs', 'fskg'],
    sensor: ['wsdcg', 'mcs', 'pir', 'ywbj', 'rqbj', 'sj', 'cobj', 'hps', 'ldcg', 'zd', 'co2bj', 'pm25', 'jqbj'],
    camera: ['sp']
  };
  function kindOf(d) {
    if (d.sensorOnly) return 'sensor';
    if (d.ir) return d.ir.ac ? 'irac' : 'irremote';
    if (isMulti(d) && !brightCode(d)) return 'multi';
    for (const k in KINDS) if (KINDS[k].includes(d.category)) return k;
    return 'generic';
  }
  function powerCode(d) {
    const st = d.status;
    const known = ['switch_led', 'switch', 'switch_1', 'fan_switch', 'switch_on'];
    return known.find((c) => typeof st[c] === 'boolean') ||
      Object.keys(st).find((c) => /^switch/.test(c) && typeof st[c] === 'boolean') || null;
  }
  // Multi-outlet devices (power strips, 2-gang switches): switch_1, switch_2, ... and USB ports.
  function channelCodes(d) {
    const st = d.status;
    const rank = (c) => { const m = c.match(/(usb)?(\d+)$/); return (m[1] ? 1000 : 0) + Number(m[2]); };
    return Object.keys(st)
      .filter((c) => /^switch_(usb)?\d+$/.test(c) && typeof st[c] === 'boolean')
      .sort((a, b) => rank(a) - rank(b));
  }
  function isMulti(d) { return channelCodes(d).length >= 2; }
  function channelName(d, code) {
    const s = S.specs[d.id];
    const custom = s && s !== 'loading' && s.names && s.names[code];
    if (custom) return custom;
    const m = code.match(/^switch_(usb)?(\d+)$/);
    return m ? (m[1] ? 'USB ' : 'Switch ') + m[2] : code;
  }
  function specReady(d) { const s = S.specs[d.id]; return !!s && s !== 'loading'; }
  function specOf(d, code) {
    const s = S.specs[d.id];
    return (s && s !== 'loading' && s.codes && s.codes[code]) || null;
  }
  // Converts a raw integer using the spec's scale; falls back to a sensible guess
  // (Tuya often sends 245 to mean 24.5 degrees).
  function scaled(d, code, guessDivide) {
    const v = d.status[code];
    if (typeof v !== 'number') return null;
    const sp = specOf(d, code);
    if (sp && typeof sp.scale === 'number') return v / Math.pow(10, sp.scale);
    return guessDivide && Math.abs(v) >= 60 ? v / 10 : v;
  }
  function rangeOf(d, code, fallback) {
    const sp = specOf(d, code);
    if (sp && typeof sp.min === 'number' && typeof sp.max === 'number') {
      return { min: sp.min, max: sp.max, step: sp.step || 1 };
    }
    return fallback;
  }
  function brightCode(d) { return ['bright_value_v2', 'bright_value'].find((c) => typeof d.status[c] === 'number') || null; }
  function warmCode(d) { return ['temp_value_v2', 'temp_value'].find((c) => typeof d.status[c] === 'number') || null; }
  // RGB colour: Tuya stores it as {h: 0-360, s, v} (0-1000 for *_v2, 0-255 for the older code).
  function colourCode(d) { return ['colour_data_v2', 'colour_data'].find((c) => c in d.status) || null; }
  function parseColour(v) {
    if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { return null; } }
    return v && typeof v.h === 'number' ? { h: v.h, s: Number(v.s) || 0, v: Number(v.v) || 0 } : null;
  }
  function colourMax(code) { return code === 'colour_data_v2' ? { s: 1000, v: 1000, vmin: 10 } : { s: 255, v: 255, vmin: 25 }; }
  function inColour(d) { return d.status.work_mode === 'colour' && !!colourCode(d); }
  function currentColour(d) {
    const code = colourCode(d), m = colourMax(code);
    return parseColour(d.status[code]) || { h: 30, s: m.s, v: m.v };
  }
  function hsvCss(h, sPct) { return 'hsl(' + Math.round(h) + ', ' + Math.round(sPct) + '%, ' + Math.round(50 + (100 - sPct) * 0.4) + '%)'; }
  function colourCss(d) {
    const code = colourCode(d), m = colourMax(code), c = currentColour(d);
    return hsvCss(c.h, (c.s / m.s) * 100);
  }
  function lightRange(d, code, isWarmth) {
    const v2 = code && code.endsWith('_v2');
    const fallback = isWarmth
      ? { min: 0, max: v2 ? 1000 : 255, step: 1 }
      : { min: v2 ? 10 : 25, max: v2 ? 1000 : 255, step: 1 };
    return rangeOf(d, code, fallback);
  }
  function toPct(v, r) { return clamp(Math.round(((v - r.min) / (r.max - r.min)) * 100), 1, 100); }
  function fromPct(p, r) {
    const raw = r.min + (clamp(p, 1, 100) / 100) * (r.max - r.min);
    return clamp(Math.round(raw / r.step) * r.step, r.min, r.max);
  }
  const MODE_LABELS = { cold: 'Cool', cool: 'Cool', hot: 'Heat', heat: 'Heat', wind: 'Fan', fan: 'Fan', auto: 'Auto', wet: 'Dry', dehumidification: 'Dry', eco: 'Eco', manual: 'Manual', smart: 'Smart', sleep: 'Sleep' };
  const modeLabel = (m) => MODE_LABELS[m] || (String(m).charAt(0).toUpperCase() + String(m).slice(1));
  const fmtTemp = (t) => (t == null ? '–' : (Math.round(t * 10) / 10) + '°');
  // Measured temperatures (sensors, "Current"): always one decimal, e.g. 23.4°, 23.0°.
  const fmtReading = (t) => (t == null || !isFinite(t) ? '–' : (Math.round(t * 10) / 10).toFixed(1) + '°');

  function isOn(d) {
    if (d.ir) return !!(d.ir.ac && d.ir.state && d.ir.state.power);
    if (isMulti(d)) return channelCodes(d).some((c) => d.status[c]);
    const p = powerCode(d); return p ? !!d.status[p] : false;
  }

  function sensorReading(d) {
    const st = d.status;
    if (typeof st.doorcontact_state === 'boolean') return st.doorcontact_state ? 'Open' : 'Closed';
    if ('pir' in st) return st.pir === 'pir' ? 'Motion detected' : 'No motion';
    if ('watersensor_state' in st) return st.watersensor_state === 'alarm' ? 'Leak detected' : 'Dry';
    if ('smoke_sensor_status' in st) return st.smoke_sensor_status === 'alarm' ? 'Smoke detected' : 'Clear';
    if ('gas_sensor_status' in st) return st.gas_sensor_status === 'alarm' ? 'Gas detected' : 'Clear';
    const t = scaled(d, 'va_temperature', true) ?? scaled(d, 'temp_current', true);
    const h = scaled(d, 'va_humidity', false) ?? scaled(d, 'humidity_value', false);
    if (t != null && h != null) return fmtReading(t) + ' and ' + Math.round(h) + '%';
    if (t != null) return fmtReading(t);
    if (h != null) return Math.round(h) + '% humidity';
    return 'Online';
  }

  // Devices that only report numbers (temperature, humidity, air quality) show as readings, not cards.
  const STATE_CODES = ['doorcontact_state', 'pir', 'watersensor_state', 'smoke_sensor_status', 'gas_sensor_status'];
  function readingsOf(d) {
    return {
      temp: scaled(d, 'va_temperature', true) ?? scaled(d, 'temp_current', true),
      hum: scaled(d, 'va_humidity', false) ?? scaled(d, 'humidity_value', false),
      co2: typeof d.status.co2_value === 'number' ? d.status.co2_value : null,
      pm25: typeof d.status.pm25_value === 'number' ? d.status.pm25_value : null
    };
  }
  function isReadingDevice(d) {
    const k = kindOf(d);
    if (k !== 'sensor' && !(k === 'generic' && !powerCode(d))) return false;
    if (STATE_CODES.some((c) => c in d.status)) return false;
    const r = readingsOf(d);
    return r.temp != null || r.hum != null || r.co2 != null || r.pm25 != null;
  }
  // Round gauges for temperature and humidity: a 270° arc open at the bottom, with a dot at the value.
  const GAUGE_TEMP = [0, 40];   // °C shown across the arc
  const GAUGE_ICONS = {
    temp: '<path d="M10.5 4.5a1.5 1.5 0 0 1 3 0v8.6a3.5 3.5 0 1 1-3 0z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="16" r="1.7" fill="currentColor"/>' +
      '<path d="M12 9.5V15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M16 5.5h2M16 8h2M16 10.5h2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',
    hum: '<path d="M3.5 8.5c1.5-1.2 3-1.2 4.5 0s3 1.2 4.5 0M3.5 12c1.5-1.2 3-1.2 4.5 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
      '<path d="M16 9.5c1.8 2.3 3 4 3 5.5a3 3 0 0 1-6 0c0-1.5 1.2-3.2 3-5.5z" fill="currentColor"/>'
  };
  function gauge(kind, label, valueText, frac) {
    const f = Math.min(1, Math.max(0, Number.isFinite(frac) ? frac : 0));
    const pt = (deg) => { const a = deg * Math.PI / 180; return [(30 + 24 * Math.cos(a)).toFixed(2), (30 + 24 * Math.sin(a)).toFixed(2)]; };
    const [sx, sy] = pt(135), [ex, ey] = pt(45), [dx, dy] = pt(135 + 270 * f);
    return '<span class="gauge" role="img" aria-label="' + label + ' ' + esc(valueText) + '">' +
      '<svg class="gauge-ring" viewBox="0 0 60 60" aria-hidden="true">' +
      '<path d="M' + sx + ' ' + sy + ' A24 24 0 1 1 ' + ex + ' ' + ey + '" fill="none" stroke="currentColor" stroke-width="5.5" stroke-linecap="round"/>' +
      '<circle class="gauge-dot" cx="' + dx + '" cy="' + dy + '" r="3.6"/>' +
      '<g transform="translate(16.2 16.2) scale(1.15)">' + GAUGE_ICONS[kind] + '</g></svg>' +
      '<span class="gauge-text" aria-hidden="true"><span class="gauge-label">' + label + '</span><span class="gauge-value">' + esc(valueText) + '</span></span></span>';
  }
  // Like the Home app's summaries: capsule buttons at the top with an icon, a title and the
  // value (a range when there are several sensors). Tap one for each sensor's reading;
  // with a single sensor, tapping opens its history straight away.
  function rangeText(vals, fmt) {
    if (!vals.length) return null;
    const lo = Math.min(...vals), hi = Math.max(...vals);
    return fmt(lo) === fmt(hi) ? fmt(lo) : fmt(lo).replace(/[^\d.\-]+$/, '') + '–' + fmt(hi);
  }
  function climateSummaries(readings, inKiosk) {
    const live = readings.filter((d) => d.online).map((d) => ({ d, r: readingsOf(d) }));
    const temps = live.map((x) => x.r.temp).filter((v) => v != null);
    const hums = live.map((x) => x.r.hum).filter((v) => v != null);
    const low = readings.some((d) => typeof d.status.battery_percentage === 'number' && d.status.battery_percentage <= 20);
    const one = readings.length === 1 ? readings[0] : null;
    // In wall tablet mode nothing navigates away: one sensor is just shown, several expand in place.
    const still = inKiosk && one;
    const act = one ? (inKiosk ? '' : 'data-act="open-history" data-id="' + esc(one.id) + '"') : 'data-act="climate-toggle"';
    const pressed = one ? '' : ' aria-expanded="' + !!S.climateOpen + '"';
    const tag = still ? 'div' : 'button';
    const btn = (key, kind, title, value, label) =>
      '<' + tag + ' class="summary" ' + act + pressed + ' data-key="sum-' + key + '"' + (still ? ' role="img"' : '') + ' aria-label="' + esc(label) + '">' +
      '<span class="sum-icon ' + kind + '">' + icon(kind === 'temp' ? 'thermo' : 'drop', 18) + '</span>' +
      '<span class="sum-text"><span class="sum-title">' + title + '</span><span class="sum-value">' + esc(value) + '</span></span></' + tag + '>';
    let html = '<div class="summaries" role="group" aria-label="Climate">';
    const t = rangeText(temps, fmtReading);
    const h = rangeText(hums, (v) => Math.round(v) + '%');
    const hint = one && !inKiosk ? ', show history' : '';
    if (t) html += btn('temp', 'temp', 'Climate', t, 'Temperature ' + t + hint);
    if (h) html += btn('hum', 'hum', 'Humidity', h, 'Humidity ' + h + hint);
    if (!t && !h) html += btn('off', 'temp', 'Climate', 'Offline', 'Climate sensors offline');
    if (low) html += '<span class="sum-warn" role="status">' + icon('alert', 14) + 'Sensor battery low</span>';
    html += '</div>';
    // Expanded: one row per sensor (room, temperature, humidity), each opening its history.
    if (!one && S.climateOpen) {
      html += '<div class="list climate-list">' + readings.map((d) => {
        const r = readingsOf(d);
        const vals = !d.online ? 'Offline' : [r.temp != null ? fmtReading(r.temp) : null, r.hum != null ? Math.round(r.hum) + '%' : null].filter(Boolean).join(' · ');
        const inner = '<span class="label">' + esc(d.name) + (d.room ? '<span class="clim-room">' + esc(d.room) + '</span>' : '') + '</span>' +
          '<span class="value icon-value">' + esc(vals) + (inKiosk ? '' : icon('chevron', 16)) + '</span>';
        return inKiosk ? '<div class="list-row">' + inner + '</div>'
          : '<button class="list-row" data-act="open-history" data-id="' + esc(d.id) + '" data-key="clim-' + esc(d.id) + '">' + inner + '</button>';
      }).join('') + '</div>';
    }
    return html;
  }

  function readingTile(d, showRoom) {
    const r = readingsOf(d);
    const lowBattery = typeof d.status.battery_percentage === 'number' && d.status.battery_percentage <= 20;
    let main = '';
    if (!d.online) {
      main = '<span class="reading-off">Offline</span>';
    } else {
      if (r.temp != null) main += gauge('temp', 'Temperature', fmtReading(r.temp), (r.temp - GAUGE_TEMP[0]) / (GAUGE_TEMP[1] - GAUGE_TEMP[0]));
      if (r.hum != null) main += gauge('hum', 'Humidity', Math.round(r.hum) + '%', r.hum / 100);
    }
    const extra = [];
    if (d.online && r.co2 != null) extra.push('CO₂ ' + r.co2 + ' ppm');
    if (d.online && r.pm25 != null) extra.push('PM2.5 ' + r.pm25 + ' µg/m³');
    return '<button class="reading' + (lowBattery ? ' low' : '') + '" data-act="open-history" data-id="' + esc(d.id) + '" data-key="reading-' + esc(d.id) + '" aria-label="' + esc(d.name + ', show history') + '"' + (lowBattery ? ' title="Battery low"' : '') + '>' +
      '<span class="reading-name">' + esc(d.name) + (showRoom && d.room ? '<span class="reading-room">' + esc(d.room) + '</span>' : '') + '</span>' +
      '<span class="reading-main gauges">' + main + '</span>' +
      (extra.length ? '<span class="reading-extra">' + extra.map((x) => '<span>' + x + '</span>').join('') + '</span>' : '') +
      (lowBattery ? '<span class="reading-warn">Battery low</span>' : '') +
      '</button>';
  }

  // ---------- Timers ("turn off in 30 min") ----------
  const TIMER_CHOICES = [[15, '15 min'], [30, '30 min'], [60, '1 hour'], [120, '2 hours']];
  const pad2 = (n) => String(n).padStart(2, '0');
  function timerTarget(d) {
    if (d.ir || !hasToggle(d)) return null;
    const on = isOn(d);
    const codes = kindOf(d) === 'multi' ? channelCodes(d) : [powerCode(d)];
    return { power: !on, functions: codes.map((c) => ({ code: c, value: !on })) };
  }
  async function loadTimers(d, force) {
    const t = S.timers[d.id];
    if (t === 'loading' || (!force && t && Date.now() - t.at < 60000)) return;
    S.timers[d.id] = 'loading';
    try { S.timers[d.id] = { list: (await api('timer?deviceId=' + encodeURIComponent(d.id))).timers || [], at: Date.now() }; }
    catch (e) { S.timers[d.id] = { error: e.message, at: Date.now(), list: [] }; }
    if (!S.dragging) render();
  }
  function timerWhen(t) {
    // One-off timers: date YYYYMMDD + time HH:MM, in the device's local time as set by this phone.
    if (!/^\d{8}$/.test(t.date || '') || t.date === '00000000') return null;
    const at = new Date(+t.date.slice(0, 4), +t.date.slice(4, 6) - 1, +t.date.slice(6, 8), +t.time.slice(0, 2), +t.time.slice(3, 5));
    return at.getTime();
  }
  function timerSection(d) {
    const target = timerTarget(d);
    if (!target) return '';
    if (!S.timers[d.id]) loadTimers(d);
    const T = S.timers[d.id];
    const now = Date.now();
    const upcoming = T && T.list ? T.list.filter((t) => (t.loops || '0000000') === '0000000' && (timerWhen(t) || 0) > now - 60000)
      .sort((a, b) => timerWhen(a) - timerWhen(b)) : [];
    const repeating = T && T.list ? T.list.filter((t) => t.loops && t.loops !== '0000000').length : 0;
    let html = '<h2 class="section-title">Timer</h2><div class="list timer-list">';
    upcoming.forEach((t) => {
      const on = (t.functions || []).some((f) => f.value === true);
      const mins = Math.max(1, Math.round((timerWhen(t) - now) / 60000));
      const left = mins >= 60 ? Math.floor(mins / 60) + ' h ' + (mins % 60 ? (mins % 60) + ' min' : '') : mins + ' min';
      html += '<div class="list-row"><span class="channel"><span class="icon-dot sm">' + icon('clock', 18) + '</span>' +
        '<span class="se-title">Turns ' + (on ? 'on' : 'off') + ' at ' + esc(t.time) + '<span class="se-room">in ' + left + '</span></span></span>' +
        '<button class="user-remove" data-act="timer-del" data-id="' + esc(d.id) + '" data-t="' + esc(t.id) + '" data-key="timer-del-' + esc(t.id) + '">Cancel</button></div>';
    });
    html += '<div class="list-row timer-add"><span class="se-label">Turn ' + (target.power ? 'on' : 'off') + ' in</span>' +
      '<div class="seg" style="--n:4">' + TIMER_CHOICES.map(([m, label]) =>
        '<button class="chip soft" data-act="timer-add" data-id="' + esc(d.id) + '" data-m="' + m + '" data-key="timer-' + m + '">' + label + '</button>').join('') + '</div></div>';
    if (T && T.error) html += '<div class="list-row"><span class="meta">Timers aren\'t available: ' + esc(T.error) + '</span></div>';
    if (repeating) html += '<div class="list-row"><span class="meta">' + repeating + (repeating === 1 ? ' repeating schedule' : ' repeating schedules') + ' from the Tuya app also run on this device.</span></div>';
    return html + '</div>';
  }
  async function addTimer(d, minutes) {
    const target = timerTarget(d);
    if (!target) return;
    const at = new Date(Date.now() + minutes * 60000);
    if (at.getSeconds() > 0) at.setMinutes(at.getMinutes() + 1);
    at.setSeconds(0, 0);
    const body = {
      op: 'add', deviceId: d.id, homeId: S.data && S.data.homeId, name: d.name,
      time: pad2(at.getHours()) + ':' + pad2(at.getMinutes()),
      date: at.getFullYear() + pad2(at.getMonth() + 1) + pad2(at.getDate()),
      timezone: timeZone(), power: target.power, functions: target.functions
    };
    try {
      await api('timer', { method: 'POST', body });
      toast((target.power ? 'Turns on' : 'Turns off') + ' at ' + body.time);
      await loadTimers(d, true);
    } catch (e) { toast('Timer not set: ' + e.message); }
  }
  async function deleteTimer(d, timerId) {
    try {
      await api('timer', { method: 'POST', body: { op: 'delete', deviceId: d.id, timerId, homeId: S.data && S.data.homeId, name: d.name } });
      toast('Timer cancelled');
      await loadTimers(d, true);
    } catch (e) { toast('Couldn\'t cancel: ' + e.message); }
  }

  // ---------- Sensor history ----------
  const HIST_CODES = [['va_temperature', 'Temperature', 'temp'], ['temp_current', 'Temperature', 'temp'], ['va_humidity', 'Humidity', 'hum'],
    ['humidity_value', 'Humidity', 'hum'], ['co2_value', 'CO₂', 'co2'], ['pm25_value', 'PM2.5', 'pm25']];
  async function loadHistory(d) {
    const codes = HIST_CODES.filter(([c]) => typeof d.status[c] === 'number').map(([c]) => c).slice(0, 3);
    S.history = { id: d.id, hours: S.histHours, loading: true };
    render();
    try {
      const r = await api('history?deviceId=' + encodeURIComponent(d.id) + '&codes=' + codes.join(',') + '&hours=' + S.histHours);
      if (S.history && S.history.id === d.id) S.history = { id: d.id, hours: S.histHours, data: r };
    } catch (e) {
      if (S.history && S.history.id === d.id) S.history = { id: d.id, hours: S.histHours, error: e.message };
    }
    render();
  }
  function historyValue(d, code, raw, scale) {
    if (scale != null) return raw / Math.pow(10, scale);
    const sp = specOf(d, code);
    if (sp && typeof sp.scale === 'number') return raw / Math.pow(10, sp.scale);
    return /temp/.test(code) && Math.abs(raw) >= 60 ? raw / 10 : raw;
  }
  function chartSvg(points, unit, hours) {
    const W = 320, H = 120, P = 6;
    const vs = points.map((p) => p[1]);
    let min = Math.min(...vs), max = Math.max(...vs);
    if (max - min < 1) { min -= 0.5; max += 0.5; }
    const t0 = points[0][0], t1 = points[points.length - 1][0], span = Math.max(1, t1 - t0);
    const x = (t) => P + ((t - t0) / span) * (W - 2 * P);
    const y = (v) => P + (1 - (v - min) / (max - min)) * (H - 2 * P);
    const line = points.map((p, i) => (i ? 'L' : 'M') + x(p[0]).toFixed(1) + ' ' + y(p[1]).toFixed(1)).join(' ');
    const area = line + ' L' + x(t1).toFixed(1) + ' ' + (H - P) + ' L' + x(t0).toFixed(1) + ' ' + (H - P) + ' Z';
    const fmt = (t) => {
      const dd = new Date(t);
      return hours > 24 ? dd.toLocaleDateString([], { weekday: 'short' }) : dd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    return '<svg class="hist-chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<path class="hist-area" d="' + area + '"/><path class="hist-line" d="' + line + '" vector-effect="non-scaling-stroke"/>' +
      '<circle class="hist-dot" cx="' + x(t1).toFixed(1) + '" cy="' + y(points[points.length - 1][1]).toFixed(1) + '" r="3.5" vector-effect="non-scaling-stroke"/></svg>' +
      '<div class="hist-axis"><span>' + fmt(t0) + '</span><span>Now</span></div>';
  }
  function historyView(id) {
    const d = findDevice(id);
    let html = '<div class="detail-head se-head-top"><button class="round-btn" data-act="tab" data-tab="devices" data-key="hist-back" aria-label="Back to devices">' + icon('back', 20) + '</button>' +
      '<div><p class="sub">' + esc(d ? (d.room || 'History') : 'History') + '</p><h1 class="detail-title">' + esc(d ? d.name : 'Sensor') + '</h1></div></div>';
    if (!d) return html + '<div class="empty"><strong>Sensor not found</strong></div>';
    html += '<div class="seg hist-range" style="--n:2" role="group" aria-label="Time range">' +
      [[24, 'Last 24 hours'], [168, 'Last 7 days']].map(([h, l]) =>
        '<button class="chip soft" data-act="hist-range" data-h="' + h + '" data-id="' + esc(d.id) + '" data-key="hist-' + h + '" aria-pressed="' + (S.histHours === h) + '">' + l + '</button>').join('') + '</div>';
    const H = S.history;
    if (!H || H.id !== d.id || H.hours !== S.histHours) { if (!H || !H.loading) loadHistory(d); return html + '<p class="note" style="text-align:left">Loading…</p>'; }
    if (H.loading) return html + '<p class="note" style="text-align:left">Loading…</p>';
    if (H.error) return html + '<div class="empty"><strong>Couldn\'t load history</strong><p>' + esc(H.error) + '</p></div>';
    const series = (H.data && H.data.series) || {};
    const shown = HIST_CODES.filter(([c]) => series[c] && series[c].points && series[c].points.length > 1);
    if (!shown.length) {
      return html + '<div class="empty"><strong>No history yet</strong><p>Tuya hasn\'t stored readings from this sensor for this period.' +
        ((H.data && H.data.reasons && H.data.reasons.length) ? ' ' + esc(H.data.reasons.join('. ')) : '') + '</p></div>';
    }
    shown.forEach(([code, label, kind]) => {
      const sc = series[code].scale;
      const pts = series[code].points.map(([t, v]) => [t, historyValue(d, code, v, sc)]);
      const vs = pts.map((p) => p[1]);
      const unit = kind === 'temp' ? '°' : kind === 'hum' ? '%' : kind === 'co2' ? ' ppm' : ' µg/m³';
      const f = (v) => (kind === 'temp' ? (Math.round(v * 10) / 10).toFixed(1) : Math.round(v)) + unit;
      html += '<section class="hist-card list"><div class="hist-head"><span class="se-label">' + label + '</span><span class="hist-now">' + f(vs[vs.length - 1]) + '</span></div>' +
        chartSvg(pts, unit, H.hours) +
        '<div class="hist-stats"><span>Low <b>' + f(Math.min(...vs)) + '</b></span><span>Average <b>' + f(vs.reduce((a, b) => a + b, 0) / vs.length) + '</b></span><span>High <b>' + f(Math.max(...vs)) + '</b></span></div></section>';
    });
    return html;
  }

  // ---------- Energy (plugs that measure power) ----------
  function hasEnergy(d) { return typeof d.status.cur_power === 'number' || 'add_ele' in d.status; }
  function liveWatts(d) {
    if (typeof d.status.cur_power !== 'number' || !specReady(d)) return null;
    const sp = specOf(d, 'cur_power');
    return d.status.cur_power / Math.pow(10, sp && typeof sp.scale === 'number' ? sp.scale : 1);
  }
  function fmtWatts(w) { return w >= 1000 ? (Math.round(w / 100) / 10) + ' kW' : (w >= 10 ? Math.round(w) : Math.round(w * 10) / 10) + ' W'; }
  function fmtKwh(k) { return k == null ? '–' : (k >= 10 ? Math.round(k * 10) / 10 : Math.round(k * 100) / 100) + ' kWh'; }
  function localYmd() { const t = new Date(); return t.getFullYear() + String(t.getMonth() + 1).padStart(2, '0') + String(t.getDate()).padStart(2, '0'); }
  async function loadEnergy(d, force) {
    const e = S.energy[d.id];
    if (e === 'loading' || (!force && e && Date.now() - e.at < 5 * 60 * 1000)) return;
    S.energy[d.id] = 'loading';
    try {
      const r = await api('energy?deviceId=' + encodeURIComponent(d.id) + '&today=' + localYmd() + '&tzo=' + (-new Date().getTimezoneOffset()));
      S.energy[d.id] = Object.assign({ at: Date.now() }, r);
    } catch (err) {
      S.energy[d.id] = { at: Date.now(), available: false, error: err.message };
    }
    const typing = document.activeElement && /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName) && document.activeElement.type !== 'range';
    if (!S.dragging && !typing) render();
  }
  function energySection(d) {
    if (!hasEnergy(d)) return '';
    if (!S.energy[d.id]) loadEnergy(d);
    const e = S.energy[d.id];
    const w = liveWatts(d);
    const st = d.status;
    const volts = typeof st.cur_voltage === 'number' && specReady(d) ? st.cur_voltage / Math.pow(10, (specOf(d, 'cur_voltage') || {}).scale ?? 1) : null;
    const amps = typeof st.cur_current === 'number' && specReady(d) ? st.cur_current / Math.pow(10, (specOf(d, 'cur_current') || {}).scale ?? 0) / 1000 : null;
    let html = '<h2 class="section-title">Energy</h2><div class="list energy">';
    html += '<div class="energy-now"><span class="se-label">Using now</span><span class="energy-watts">' + (w == null ? '…' : fmtWatts(d.online && isOn(d) ? w : 0)) + '</span>' +
      ((volts != null || amps != null) ? '<span class="energy-meta">' + [volts != null ? Math.round(volts) + ' V' : '', amps != null ? (Math.round(amps * 100) / 100) + ' A' : ''].filter(Boolean).join(', ') + '</span>' : '') + '</div>';
    if (e === 'loading' || !e) {
      html += '<div class="list-row"><span class="meta">Loading usage…</span></div>';
    } else if (e.available && e.days) {
      const max = Math.max(0.0001, ...e.days.map((x) => x.kwh));
      const dayName = (ymd) => ['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8)).getDay()];
      html += '<div class="energy-chart" role="img" aria-label="Daily use over the last 7 days: ' + esc(e.days.map((x) => fmtKwh(x.kwh)).join(', ')) + '">' +
        e.days.map((x, i) => '<span class="bar-wrap"><span class="bar' + (i === e.days.length - 1 ? ' today' : '') + '" style="height:' + Math.max(4, Math.round((x.kwh / max) * 100)) + '%"></span><span class="bar-day">' + dayName(x.day) + '</span></span>').join('') + '</div>';
      if (e.source === 'estimate') html += '<div class="list-row"><span class="meta">Estimated from this plug\'s power readings, since Tuya doesn\'t keep its energy totals.</span></div>';
      html += '<div class="list-row"><span class="label">Today</span><span class="value">' + fmtKwh(e.today) + '</span></div>' +
        '<div class="list-row"><span class="label">Last 7 days</span><span class="value">' + fmtKwh(e.week) + '</span></div>' +
        (e.total != null ? '<div class="list-row"><span class="label">All time</span><span class="value">' + fmtKwh(e.total) + '</span></div>' : '');
    } else if (e.available) {
      html += '<div class="list-row"><span class="label">All time</span><span class="value">' + fmtKwh(e.total) + '</span></div>';
    } else {
      const why = (e.reasons || []).join('. ') || e.error || '';
      const denied = /permission|deny|not authorized|No permissions/i.test(why);
      html += '<div class="list-row energy-why"><span class="meta">' +
        (denied
          ? 'Tuya refused the usage history. In your Tuya cloud project, open Service API and authorize the device log and data statistics services, then pull down to refresh.'
          : 'No usage history yet. Tuya hasn\'t received energy reports from this plug in the last 7 days.') +
        (why ? '<br><span class="why-detail">' + esc(why) + '</span>' : '') + '</span></div>' +
        '<button class="list-row" data-act="energy-retry" data-id="' + esc(d.id) + '" data-key="energy-retry"><span class="label">Try again</span>' + icon('chevron', 16) + '</button>';
    }
    return html + '</div>';
  }

  // Like the Home app: "Cooling to 24°", "Heating to 28°", "Auto, 24°", "Fan only", "Drying".
  function acStatus(mode, temp) {
    if (mode === 'Cool') return 'Cooling to ' + temp;
    if (mode === 'Heat') return 'Heating to ' + temp;
    if (mode === 'Auto') return 'Auto, ' + temp;
    if (mode === 'Fan') return 'Fan only';
    if (mode === 'Dry') return 'Drying';
    return mode ? mode + ' to ' + temp : 'Set to ' + temp;
  }
  // The room temperature for an AC: its own sensor, or the IR blaster's thermometer.
  function acRoomTemp(d) {
    if (kindOf(d) === 'irac') {
      const hub = d.ir && d.ir.hub ? findDevice(d.ir.hub) : null;
      return hub ? (scaled(hub, 'va_temperature', true) ?? scaled(hub, 'temp_current', true)) : null;
    }
    return scaled(d, 'temp_current', true);
  }
  function statusText(d) {
    if (!d.online) return 'Offline';
    const k = kindOf(d), on = isOn(d), st = d.status;
    if (k === 'light') {
      if (!on) return 'Off';
      if (inColour(d)) {
        const m = colourMax(colourCode(d)), c = currentColour(d);
        return 'Color, ' + toPct(c.v, { min: m.vmin, max: m.v }) + '%';
      }
      const bc = brightCode(d);
      return bc && specReady(d) ? toPct(st[bc], lightRange(d, bc)) + '%' : 'On';
    }
    if (k === 'climate') {
      if (powerCode(d) && !on) return 'Off';
      const set = scaled(d, 'temp_set', true);
      return set != null ? acStatus(st.mode ? modeLabel(st.mode) : '', fmtTemp(set)) : 'On';
    }
    if (k === 'cover') {
      const p = st.percent_state ?? st.percent_control;
      return typeof p === 'number' ? p + '% open' : 'Ready';
    }
    if (k === 'irac') {
      const st2 = d.ir.state || {};
      return st2.power ? acStatus(IR_MODES[st2.mode] || '', st2.temp + '°') : 'Off';
    }
    if (k === 'irremote') return 'Remote control';
    if (k === 'multi') {
      const codes = channelCodes(d), n = codes.filter((c) => st[c]).length;
      const w = n ? liveWatts(d) : null;
      return (n === 0 ? 'Off' : n === codes.length ? 'All on' : n + ' of ' + codes.length + ' on') + (w != null && w > 0 ? ', ' + fmtWatts(w) : '');
    }
    if (hasEnergy(d) && powerCode(d) && on) {
      const w = liveWatts(d);
      if (w != null) return 'On, ' + fmtWatts(w);
    }
    if (k === 'sensor') return sensorReading(d);
    if (k === 'camera') return 'Online';
    const p = powerCode(d);
    return p ? (on ? 'On' : 'Off') : 'Online';
  }
  const hasToggle = (d) => {
    const k = kindOf(d);
    if (k === 'irac') return true;
    if (k === 'irremote') return false;
    return !!powerCode(d) && k !== 'sensor' && k !== 'camera';
  };
  // IR air conditioner settings, in the order Tuya numbers them.
  const IR_MODES = ['Cool', 'Heat', 'Auto', 'Fan', 'Dry'];
  const IR_WIND = ['Auto', 'Low', 'Medium', 'High'];

  // ---------- Commands ----------
  const pendingSend = {};
  async function send(d, commands, patch, opts) {
    opts = opts || {};
    const before = Object.assign({}, d.status);
    Object.assign(d.status, patch || {});
    S.touched[d.id] = Date.now();
    markPending(d.id, 1);
    if (!opts.noRender) render();
    try {
      await api('command', { method: 'POST', body: { deviceId: d.id, commands, homeId: S.data && S.data.homeId, name: d.name } });
      S.touched[d.id] = Date.now();
      statusSoon();
    } catch (e) {
      d.status = opts.revertTo || before;
      toast(d.name + ': ' + e.message);
    } finally {
      markPending(d.id, -1);
      render();
    }
  }
  function markPending(id, delta) {
    const n = (S.pending[id] || 0) + delta;
    if (n > 0) S.pending[id] = n; else delete S.pending[id];
  }
  const isPending = (id) => !!S.pending[id];
  // Debounced send for +/- taps, so five quick taps become one command.
  function sendSoon(d, code, value) {
    const key = d.id + code;
    if (!pendingSend[key]) pendingSend[key] = { id: d.id, before: Object.assign({}, d.status) };
    d.status[code] = value;
    S.touched[d.id] = Date.now();
    render();
    clearTimeout(pendingSend[key].t);
    pendingSend[key].t = setTimeout(() => {
      const revertTo = pendingSend[key].before;
      delete pendingSend[key];
      send(d, [{ code, value: d.status[code] }], null, { noRender: true, revertTo });
    }, 600);
  }

  function findDevice(id) { return S.data && S.data.devices.find((x) => x.id === id); }
  // A change waiting to be sent (debounced) or on its way: a status refresh mustn't undo it.
  function hasLocalChange(id) { return isPending(id) || Object.values(pendingSend).some((p) => p.id === id); }

  // ---------- Icons (inline stroke SVG) ----------
  const P = {
    light: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V17h5v-1.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
    lamp: '<path d="M8 3h8l3 7H5l3-7zM12 10v11M8 21h8"/>',
    ceiling: '<path d="M12 3v4M5 15a7 7 0 0 1 14 0zM10 18a2 2 0 0 0 4 0"/>',
    ring: '<circle cx="12" cy="10" r="7"/><circle cx="12" cy="10" r="3"/><path d="M12 17v4M8 21h8"/>',
    strip: '<path d="M3 14c3-6 6-6 9 0s6 6 9 0"/><path d="M6 10.5v.01M12 14v.01M18 17.5v.01"/>',
    switch: '<rect x="6" y="3" width="12" height="18" rx="3"/><path d="M12 7v4"/>',
    heater: '<path d="M8 3c-2 3 2 5 0 8M12 3c-2 3 2 5 0 8M16 3c-2 3 2 5 0 8M4 15h16v5H4z"/>',
    motion: '<path d="M12 12h.01M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8"/>',
    tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
    speaker: '<rect x="6" y="3" width="12" height="18" rx="3"/><circle cx="12" cy="14" r="3"/><path d="M12 7v.01"/>',
    appliance: '<path d="M6 8h11l-1 12H7L6 8zM9 8V5h5v3M17 10h2v5h-2.4"/>',
    router: '<rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 16.5v.01M11 16.5v.01M8.5 9.5a5 5 0 0 1 7 0M6 7a9 9 0 0 1 12 0"/>',
    sofa: '<path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3M3 12a1.5 1.5 0 0 1 3 0v2h12v-2a1.5 1.5 0 0 1 3 0v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM6 17v2M18 17v2"/>',
    bed: '<path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 15h18M3 18v2M21 18v2M6 10V7h5v3"/>',
    pot: '<path d="M4 10h16v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM2 10h2M20 10h2M9 6.5c0-1 1-1 1-2.5M14 6.5c0-1 1-1 1-2.5"/>',
    bath: '<path d="M3 12h18v2.5a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5zM6 12V6a2 2 0 0 1 4 0M7 19.5l-1 2M17 19.5l1 2"/>',
    door: '<path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M4 21h16M14 12v.01"/>',
    tree: '<path d="M12 21v-5M6 16h12L12 3z"/>',
    desk: '<path d="M3 8h18M5 8v12M19 8v12M13 8v6h6"/>',
    car: '<path d="M5 17h14v-4l-2-5H7l-2 5zM5 17v2M19 17v2M8 13.5v.01M16 13.5v.01"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    sunrise: '<path d="M3 19h18M7 19a5 5 0 0 1 10 0M12 3v6M9 6l3-3 3 3M4.6 12.6l1.4 1.4M19.4 12.6 18 14"/>',
    sunset: '<path d="M3 19h18M7 19a5 5 0 0 1 10 0M12 3v6M9 6l3 3 3-3M4.6 12.6l1.4 1.4M19.4 12.6 18 14"/>',
    cloudsun: '<path d="M8 2.5V4M2.5 8H4M4.1 4.1l1.1 1.1M12.6 6.4A4 4 0 0 0 5.1 9"/><path d="M8.5 20h8.5a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.4 1.8A3.2 3.2 0 0 0 8.5 20z"/>',
    cloud: '<path d="M7 19h10a4.5 4.5 0 0 0 .6-9 6 6 0 0 0-11.5 1.8A3.6 3.6 0 0 0 7 19z"/>',
    fog: '<path d="M4 8h16M3 12h18M5 16h14M8 20h8"/>',
    rain: '<path d="M7 15h10a4.5 4.5 0 0 0 .6-9 6 6 0 0 0-11.5 1.8A3.6 3.6 0 0 0 7 15z"/><path d="M8 21l1-3M12 21l1-3M16 21l1-3"/>',
    snow: '<path d="M7 15h10a4.5 4.5 0 0 0 .6-9 6 6 0 0 0-11.5 1.8A3.6 3.6 0 0 0 7 15z"/><path d="M8 19v.01M12 21v.01M16 19v.01"/>',
    storm: '<path d="M7 15h10a4.5 4.5 0 0 0 .6-9 6 6 0 0 0-11.5 1.8A3.6 3.6 0 0 0 7 15z"/><path d="M12.5 15l-2 3.5h3l-2 3.5"/>',
    wifioff: '<path d="M2 2l20 20M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 5.2-2.7M19 12.9a10 10 0 0 0-2.3-1.6M2 9.3a15 15 0 0 1 4.3-2.6M22 9.3a15 15 0 0 0-11-3.8M12 20h.01"/>',
    desklamp: '<path d="M4 21h10"/><path d="M9 21l-2-7 6-5"/><path d="M12.5 6.5l3.5-3 5 5-3.5 3z"/><circle cx="7" cy="14" r="1"/>',
    column: '<rect x="8" y="2" width="8" height="15" rx="1.5"/><path d="M8 6h8M8 10h8M8 14h8M9.5 17l-1 4M14.5 17l1 4M8 21h8"/>',
    starlight: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    pendant: '<path d="M12 2v5M5 15c0-4 3-7 7-7s7 3 7 7zM10.5 18.5a1.5 1.5 0 0 0 3 0"/>',
    tablelamp: '<path d="M7 4h10l2 7H5zM12 11v6M9 17h6v4H9z"/>',
    walllight: '<path d="M4 4v16M4 12h4M8 8h6l3 8H8z"/>',
    lantern: '<path d="M9 3h6M12 3V2M8 6h8l1 2v9l-1 2H8l-1-2V8zM10 21h4M10 11v4M14 11v4"/>',
    fairy: '<path d="M2 6c4 4 8 4 10 2s6-2 10 2"/><path d="M6 9.5v2M12 8v2.5M18 9.5v2"/><circle cx="6" cy="13" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18" cy="13" r="1.5"/>',
    nightlight: '<path d="M15 4a7 7 0 1 0 5 12A8 8 0 0 1 15 4z"/><path d="M19 3v2M18 4h2"/>',
    spotlight: '<path d="M4 21h7M7.5 21v-4M5 13l7-7 4 4-7 7z"/><path d="M17 12l3 2M15 15l2 3.5M14 8l1-4"/>',
    tree: '<path d="M12 2l5 7h-3l4 6h-4l3 5H7l3-5H6l4-6H7z"/><path d="M12 20v2"/>',
    purifier: '<rect x="6" y="3" width="12" height="18" rx="3"/><path d="M9 7h6M9 10h6"/><circle cx="12" cy="15" r="2"/>',
    humidifier: '<path d="M12 3s-3 4-3 6a3 3 0 0 0 6 0c0-2-3-6-3-6z"/><rect x="6" y="13" width="12" height="8" rx="3"/>',
    coffee: '<path d="M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10h2a2 2 0 0 1 0 4h-2M8 3v2M11 3v2M5 21h12"/>',
    washer: '<rect x="4" y="3" width="16" height="18" rx="3"/><circle cx="12" cy="13" r="4.5"/><path d="M7 6.5h2M15 6.5h.01"/>',
    robovac: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="9" r="2"/><path d="M7 16h10"/>',
    fridge: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M6 10h12M9 5v2M9 13v3"/>',
    boiler: '<rect x="7" y="2" width="10" height="16" rx="3"/><path d="M10 21v-3M14 21v-3M12 6.5c-1.2 1.5-1.2 2.7 0 4M10 13.5h4"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4M12 15v2"/>',
    doorbell: '<rect x="8" y="3" width="8" height="18" rx="4"/><circle cx="12" cy="14" r="2"/><path d="M12 7h.01"/>',
    garage: '<path d="M3 10l9-6 9 6v11H3zM7 21v-8h10v8M7 16h10"/>',
    plant: '<path d="M7 14h10l-1.5 7h-7zM12 14V9M12 9c0-3-2-5-5-5 0 3 2 5 5 5zM12 11c0-2.5 2-4 4.5-4 0 2.5-2 4-4.5 4z"/>',
    petbowl: '<path d="M3 15h18l-2 5H5zM8 15a4 4 0 0 1 8 0"/><circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="12" cy="4.5" r="1.2"/>',
    pin: '<path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    remote: '<rect x="7" y="2" width="10" height="20" rx="3"/><path d="M12 6v.01M10 10h4M10 13.5h4M10 17h4"/>',
    multi: '<rect x="2" y="8" width="20" height="8" rx="3"/><path d="M7 11v2M12 11v2M17 11v2"/>',
    pencil: '<path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4"/>',
    grip: '<circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    arrange: '<path d="M7 4v16M4 7l3-3 3 3M17 20V4M14 17l3 3 3-3"/>',
    alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
    tablet: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M10 16h4"/>',
    plug: '<path d="M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-12 0V8zM12 17v5"/>',
    climate: '<rect x="2" y="4" width="20" height="9" rx="2"/><path d="M6 9h12M8 17v3M12 17v4M16 17v3"/>',
    cover: '<path d="M3 3h18M5 3v18M19 3v18M5 21c2-5 2-11 0-18M19 21c-2-5-2-11 0-18"/>',
    fan: '<circle cx="12" cy="12" r="2"/><path d="M12 10c0-4 1-7 4-7s2 5-2 7M14 12c4 0 7 1 7 4s-5 2-7-2M12 14c0 4-1 7-4 7s-2-5 2-7M10 12c-4 0-7-1-7-4s5-2 7 2"/>',
    sensor: '<path d="M6 3h9v18H6zM15 7l4 1v9l-4 1M11 12h.01"/>',
    thermo: '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"/>',
    camera: '<path d="M3 7h12v10H3zM15 10l6-3v10l-6-3"/>',
    generic: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 12h6"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    scenes: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
    me: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    power: '<path d="M12 3v8M6.3 7.3a8 8 0 1 0 11.4 0"/>',
    flake: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17l17.4-10M9.5 3.5 12 6l2.5-2.5M9.5 20.5 12 18l2.5 2.5M3.6 10.4 6.8 9.5 5.9 6.2M18.1 17.8l-.9-3.3 3.2-.9M3.6 13.6l3.2.9-.9 3.3M18.1 6.2l-.9 3.3 3.2.9"/>',
    fanauto: '<g transform="translate(-1 -1) scale(.82)"><circle cx="12" cy="12" r="2"/><path d="M12 10c0-4 1-7 4-7s2 5-2 7M14 12c4 0 7 1 7 4s-5 2-7-2M12 14c0 4-1 7-4 7s-2-5 2-7M10 12c-4 0-7-1-7-4s5-2 7 2"/></g><path d="M15.8 22.5 18.5 16l2.7 6.5M16.8 20.3h3.4"/>',
    automode: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v4h-4"/><path d="M9 15.5 12 8l3 7.5M10 13.2h4"/>',
    chevron: '<path d="M9 5l7 7-7 7"/>',
    play: '<path d="M7 5l12 7-12 7z" fill="currentColor" stroke="none"/>',
    check: '<path d="M5 12l5 5 9-10"/>'
  };
  const icon = (name, size) => '<svg width="' + (size || 22) + '" height="' + (size || 22) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + P[name] + '</svg>';
  const ICON_CHOICES = [
    ['light', 'Bulb'], ['lamp', 'Floor lamp'], ['column', 'Column lamp'], ['desklamp', 'Desk lamp'], ['tablelamp', 'Table lamp'],
    ['ceiling', 'Ceiling light'], ['pendant', 'Pendant'], ['walllight', 'Wall light'], ['spotlight', 'Spotlight'], ['ring', 'Ring lamp'],
    ['strip', 'Light strip'], ['fairy', 'Fairy lights'], ['lantern', 'Lantern'], ['starlight', 'Star light'], ['nightlight', 'Night light'], ['tree', 'Christmas tree'], ['plug', 'Plug'], ['multi', 'Power strip'], ['switch', 'Wall switch'],
    ['fan', 'Fan'], ['climate', 'Air conditioner'], ['heater', 'Heater'], ['thermo', 'Thermometer'],
    ['cover', 'Curtains'], ['sensor', 'Door sensor'], ['motion', 'Motion sensor'], ['camera', 'Camera'],
    ['purifier', 'Air purifier'], ['humidifier', 'Humidifier'], ['boiler', 'Water heater'],
    ['tv', 'TV'], ['speaker', 'Speaker'], ['appliance', 'Kettle'], ['coffee', 'Coffee maker'], ['washer', 'Washing machine'],
    ['fridge', 'Fridge'], ['robovac', 'Robot vacuum'], ['lock', 'Lock'], ['doorbell', 'Doorbell'], ['garage', 'Garage'],
    ['plant', 'Plant'], ['petbowl', 'Pet feeder'], ['router', 'Router'], ['remote', 'Remote'], ['generic', 'Other']
  ];
  // Product photos that can be used instead of a line icon (transparent WebP files in /devices).
  const PHOTOS = {
    photodesk:   { src: '/devices/desk.webp',   name: 'Black desk lamp' },
    photocolumn: { src: '/devices/column.webp', name: 'White column lamp' },
    photodonut:  { src: '/devices/donut.webp',  name: 'Orange donut lamp' },
    phototable:  { src: '/devices/table.webp',  name: 'Blue table lamp' },
    photoac:      { src: '/devices/ac.webp',      name: 'White air conditioner' },
    photolantern: { src: '/devices/lantern.webp', name: 'Paper lantern lamp' },
    photostar:    { src: '/devices/star.webp',    name: 'Orange star lamp' }
  };
  const photoOf = (d) => PHOTOS[iconKeyOf(d)] || null;
  const photoImg = (ph) => '<img class="dev-photo" src="' + ph.src + '" alt="" draggable="false" decoding="async">';
  // The glow behind a photo of a device that is on: stronger when brighter, in the light's colour.
  function photoGlow(d) {
    if (!d.online || !isOn(d)) return 'transparent';
    if (kindOf(d) === 'light') {
      if (inColour(d)) {
        const m = colourMax(colourCode(d)), c = currentColour(d);
        return 'hsla(' + Math.round(c.h) + ', ' + Math.max(60, Math.round((c.s / m.s) * 100)) + '%, 60%, 0.6)';
      }
      const bc = brightCode(d);
      if (bc && specReady(d)) return 'rgba(255, 206, 140, ' + (0.25 + 0.5 * toPct(d.status[bc], lightRange(d, bc)) / 100).toFixed(2) + ')';
    }
    return 'rgba(255, 206, 140, 0.5)';
  }
  function iconKeyOf(d) {
    const custom = S.icons[d.id];
    if (custom && (P[custom] || PHOTOS[custom])) return custom;
    const k = kindOf(d);
    if (k === 'irac') return 'climate';
    if (k === 'irremote') {
      const map = { infrared_tv: 'tv', infrared_stb: 'tv', infrared_box: 'tv', infrared_fan: 'fan', infrared_light: 'light', infrared_amplifier: 'speaker', infrared_speaker: 'speaker' };
      return map[d.category] || 'remote';
    }
    if (k === 'sensor' && !('doorcontact_state' in d.status)) {
      if ('pir' in d.status) return 'motion';
      if ('va_temperature' in d.status || 'temp_current' in d.status) return 'thermo';
    }
    return P[k] ? k : 'generic';
  }
  function deviceIcon(d, size) { const ph = photoOf(d); return ph ? photoImg(ph) : icon(iconKeyOf(d), size); }

  // ---------- Views ----------
  function tabs(active) {
    const items = [['devices', 'Devices', 'grid'], ['scenes', 'Scenes', 'scenes'], ['me', 'Me', 'me']];
    return items.map(([id, label, ic]) =>
      '<button class="tab" data-act="tab" data-tab="' + id + '" data-key="tab-' + id + '" aria-label="' + label + '" title="' + label + '"' +
      (active === id ? ' aria-current="page"' : '') + '><span class="pill">' + icon(ic) + '</span><span class="tab-label">' + label + '</span></button>'
    ).join('');
  }

  function switchBtn(d, extraKey, code, vertical) {
    const on = code ? !!d.status[code] : isOn(d);
    const label = code ? channelName(d, code) : d.name + (isMulti(d) ? ', all outlets' : ' power');
    const busy = isPending(d.id);
    return '<button class="switch' + (vertical ? ' v' : '') + (busy ? ' pending' : '') + '" role="switch" aria-checked="' + on + '" aria-label="' + esc(label) + '"' + (busy ? ' aria-busy="true"' : '') +
      ' data-act="toggle" data-id="' + esc(d.id) + '"' + (code ? ' data-code="' + esc(code) + '"' : '') +
      ' data-key="sw-' + esc(d.id) + (code ? '-' + esc(code) : '') + (extraKey || '') + '"' +
      (d.online ? '' : ' disabled') + '><span class="knob"></span></button>';
  }

  // Compact tile, like the Home app's accessory tiles: a round icon on the left (tap it to turn the
  // device on or off) and the name and state beside it (tap for the full controls).
  // Air conditioners, like the Home app's thermostat tile: a tall tile with the room temperature
  // in large coloured numbers (blue cooling, orange heating...), name and status underneath. Tap to open.
  function acCard(d, selectedId) {
    const on = isOn(d), theme = acTheme(d), room = acRoomTemp(d), r = S.reorder;
    // When the big number is already the set temperature, the line below just says what it's doing.
    const status = room == null && on ? ({ cool: 'Cooling', heat: 'Heating', auto: 'Auto' })[theme] || statusText(d) : statusText(d);
    const cls = ['card', 'compact', 'ac-tile', 'ac-big', 'ac-' + theme, on ? 'active' : '', d.id === selectedId ? 'selected' : '', isPending(d.id) ? 'pending' : ''].join(' ');
    // The room temperature when the AC (or its IR blaster) measures it; otherwise what it's set to.
    const setTo = kindOf(d) === 'irac' ? (d.ir.state || {}).temp : scaled(d, 'temp_set', true);
    const big = room != null ? room : setTo;
    const top = big != null
      ? '<span class="ac-big-num">' + Math.round(big) + '°</span>'
      : '<span class="ac-big-icon" aria-hidden="true">' + deviceIcon(d) + '</span>';
    return '<div class="' + cls + '" data-card-id="' + esc(d.id) + '">' +
      '<button class="card-open"' + (r ? ' inert' : '') + ' data-act="open" data-id="' + esc(d.id) + '" data-key="open-' + esc(d.id) + '" aria-label="' +
      esc(d.name + ', ' + (room != null ? Math.round(room) + '° in the room, ' : big != null ? 'set to ' + Math.round(big) + '°, ' : '') + status + ', show controls') + '">' + top +
      '<span class="card-text"><span class="card-name">' + esc(d.name) + '</span><span class="card-status">' + esc(status) + '</span></span></button>' +
      (r ? '<button class="card-grip" data-key="grip-' + esc(d.id) + '" aria-label="Move ' + esc(d.name) + '. Use the arrow keys.">' + icon('grip', 18) + '</button>' : '') +
      '</div>';
  }
  function deviceCard(d, selectedId) {
    const on = isOn(d), toggle = hasToggle(d), lit = toggle && on && d.online;
    if (d.online && isKioskAc(d)) return acCard(d, selectedId);
    const cls = ['card', 'compact', photoOf(d) ? 'has-photo' : '', lit ? 'active' : '', d.online ? '' : 'offline', d.id === selectedId ? 'selected' : '', isPending(d.id) ? 'pending' : ''].join(' ');
    const r = S.reorder, busy = isPending(d.id);
    const colour = lit && kindOf(d) === 'light' && inColour(d) ? ' style="background:' + colourCss(d) + ';color:#141414"' : '';
    const glyph = photoOf(d)
      ? '<span class="tile-photo' + (lit ? ' lit' : '') + '" style="--glow-color:' + photoGlow(d) + '">' + photoImg(photoOf(d)) + '</span>'
      : deviceIcon(d);
    const iconEl = toggle
      ? '<button class="card-icon icon-dot' + (busy ? ' pending' : '') + '" role="switch" aria-checked="' + on + '" aria-label="' + esc(d.name + (isMulti(d) ? ', all outlets' : ' power')) + '"' +
        (busy ? ' aria-busy="true"' : '') + ' data-act="toggle" data-id="' + esc(d.id) + '" data-key="sw-' + esc(d.id) + '"' + (d.online ? '' : ' disabled') + (r ? ' inert' : '') + colour + '>' + glyph + '</button>'
      : '<span class="card-icon icon-dot" aria-hidden="true">' + glyph + '</span>';
    const status = d.online ? statusText(d) : 'Offline';
    return '<div class="' + cls + '" data-card-id="' + esc(d.id) + '">' + iconEl +
      '<button class="card-open"' + (r ? ' inert' : '') + ' data-act="open" data-id="' + esc(d.id) + '" data-key="open-' + esc(d.id) + '" aria-label="' + esc(d.name) + ', ' + esc(status) + ', show controls">' +
      '<span class="card-text"><span class="card-name">' + esc(d.name) + '</span><span class="card-status">' + esc(status) + '</span></span></button>' +
      (r ? '<button class="card-grip" data-key="grip-' + esc(d.id) + '" aria-label="Move ' + esc(d.name) + '. Use the arrow keys.">' + icon('grip', 18) + '</button>' : '') +
      '</div>';
  }

  // ---------- Card order (Arrange) ----------
  function sortByOrder(list, homeId) {
    const o = S.order && S.order[homeId];
    if (!Array.isArray(o) || !o.length) return list;
    const pos = new Map(o.map((id, i) => [id, i]));
    return list.map((d, i) => [d, pos.has(d.id) ? pos.get(d.id) : 1e6 + i]).sort((a, b) => a[1] - b[1]).map((x) => x[0]);
  }
  // visibleIds: the new order of the cards on screen (maybe one room). Other cards keep their places.
  function saveOrder(visibleIds) {
    const homeId = S.data && S.data.homeId;
    if (!homeId) return;
    const all = sortByOrder(S.data.devices.filter((d) => !isReadingDevice(d)), homeId).map((d) => d.id);
    const set = new Set(visibleIds), merged = all.slice();
    let k = 0;
    all.forEach((id, i) => { if (set.has(id)) merged[i] = visibleIds[k++]; });
    S.order = Object.assign({}, S.order, { [homeId]: merged });
    store.set('order', JSON.stringify(S.order));
    if (S.sync && S.mode === 'live') {
      clearTimeout(saveOrder.t);
      saveOrder.t = setTimeout(() => {
        api('settings', { method: 'POST', body: { order: { homeId, ids: S.order[homeId] } } })
          .catch(() => toast('The new order is saved on this device but couldn\'t sync.'));
      }, 600);
    }
  }
  const gridIds = (grid) => Array.from(grid.querySelectorAll('.card')).map((c) => c.dataset.cardId);
  let cardDrag = null;
  document.addEventListener('pointerdown', (e) => {
    const grip = S.reorder && e.target.closest && e.target.closest('.reordering .card-grip');
    if (!grip) return;
    e.preventDefault();
    const card = grip.closest('.card');
    cardDrag = { card, grid: card.parentElement, before: gridIds(card.parentElement).join(','), scroller: card.closest('.dv-scroll') };
    S.dragging = true;
    card.classList.add('lifted');
    if (grip.setPointerCapture) grip.setPointerCapture(e.pointerId);
  });
  document.addEventListener('pointermove', (e) => {
    if (!cardDrag) return;
    const { card, grid, scroller } = cardDrag;
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const t = under && under.closest && under.closest('.card');
    if (t && t !== card && t.parentElement === grid) {
      const cards = Array.from(grid.children), from = cards.indexOf(card), to = cards.indexOf(t);
      // FLIP: remember where cards were, move, then animate from there.
      const before = new Map(cards.map((c) => [c, c.getBoundingClientRect()]));
      grid.insertBefore(card, from < to ? t.nextSibling : t);
      cards.forEach((c) => {
        if (c === card) return;
        const a = before.get(c), b = c.getBoundingClientRect();
        if (a.left === b.left && a.top === b.top) return;
        c.animate([{ transform: 'translate(' + (a.left - b.left) + 'px,' + (a.top - b.top) + 'px)' }, { transform: 'none' }], { duration: 180, easing: 'ease-out' });
      });
    }
    // Scroll when dragging near the edges of the list.
    const sc = scroller && scroller.scrollHeight > scroller.clientHeight ? scroller : document.scrollingElement;
    const box = sc === document.scrollingElement ? { top: 0, bottom: window.innerHeight } : sc.getBoundingClientRect();
    if (e.clientY > box.bottom - 70) sc.scrollBy(0, 14);
    else if (e.clientY < box.top + 50) sc.scrollBy(0, -14);
  });
  function endCardDrag() {
    if (!cardDrag) return;
    const { card, grid, before } = cardDrag;
    cardDrag = null; S.dragging = false;
    card.classList.remove('lifted');
    const ids = gridIds(grid);
    if (ids.join(',') !== before) saveOrder(ids);
  }
  document.addEventListener('pointerup', endCardDrag);
  document.addEventListener('pointercancel', endCardDrag);
  document.addEventListener('keydown', (e) => {
    const grip = S.reorder && e.target.closest && e.target.closest('.reordering .card-grip');
    if (!grip) return;
    const dir = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    const card = grip.closest('.card'), grid = card.parentElement, ids = gridIds(grid), i = ids.indexOf(card.dataset.cardId), j = i + dir;
    if (j < 0 || j >= ids.length) return;
    ids.splice(j, 0, ids.splice(i, 1)[0]);
    saveOrder(ids); render();
  });

  function roomIcon(name) {
    const n = String(name).toLowerCase();
    if (n === 'all') return 'grid';
    if (/living|lounge|family|sala/.test(n)) return 'sofa';
    if (/bed|master|guest|kid|nursery/.test(n)) return 'bed';
    if (/kitchen|dining|pantry/.test(n)) return 'pot';
    if (/bath|toilet|wc|shower|laundry/.test(n)) return 'bath';
    if (/hall|entr|foyer|corridor|stair/.test(n)) return 'door';
    if (/garden|patio|yard|balcon|terrace|outdoor|pool/.test(n)) return 'tree';
    if (/office|study|work/.test(n)) return 'desk';
    if (/garage|car|parking/.test(n)) return 'car';
    return 'home';
  }
  function greeting() {
    const name = S.me && S.me.name && !(S.me.owner && S.me.name === 'Owner') ? S.me.name : '';
    return name ? 'Hi ' + name + '!' : 'Hi there!';
  }

  // Weather for the greeting (WMO weather codes from Open-Meteo).
  function weatherInfo(code, isDay) {
    if (code === 0) return isDay ? ['sun', 'Clear'] : ['moon', 'Clear'];
    if (code === 1) return isDay ? ['sun', 'Mainly clear'] : ['moon', 'Mainly clear'];
    if (code === 2) return ['cloudsun', 'Partly cloudy'];
    if (code === 3) return ['cloud', 'Overcast'];
    if (code === 45 || code === 48) return ['fog', 'Fog'];
    if (code >= 51 && code <= 57) return ['rain', 'Drizzle'];
    if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return ['rain', code >= 80 ? 'Rain showers' : 'Rain'];
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return ['snow', 'Snow'];
    if (code >= 95) return ['storm', 'Thunderstorm'];
    return ['cloud', 'Cloudy'];
  }
  // ---------- Optional backgrounds ----------
  const BACKGROUNDS = [['system', 'System'], ['aura', 'Aura'], ['ember', 'Ember'], ['tide', 'Tide'], ['mist', 'Mist'], ['halftone', 'Halftone'], ['dusk', 'Dusk']];
  function applyBackground() {
    const root = document.documentElement;
    if (S.bg && S.bg !== 'system') root.setAttribute('data-bg', S.bg); else root.removeAttribute('data-bg');
    // Photo backgrounds are dark, so the status bar follows.
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
      if (!m.dataset.orig) m.dataset.orig = m.getAttribute('content');
      m.setAttribute('content', S.bg && S.bg !== 'system' ? '#000000' : m.dataset.orig);
    });
  }
  applyBackground();

  // ---------- Distance from home ----------
  // Uses the phone's location only on the phone: it's compared with the home's coordinates here
  // and never sent to the server.
  function kmBetween(a, b) {
    const R = 6371, rad = (x) => x * Math.PI / 180;
    const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function distanceLine(homeId) {
    const w = S.weather, p = S.myPos;
    if (!S.showDistance || !w || w.homeId !== homeId || w.lat == null || !p) return '';
    const km = kmBetween(p, w);
    let text;
    if (km < 0.15) text = 'You\'re home';
    else if (km < 1) text = 'You\'re ' + Math.max(100, Math.round(km * 10) * 100) + ' m from home';
    else text = 'You\'re ' + (km < 10 ? Math.round(km * 10) / 10 : Math.round(km)) + ' km from home';
    return '<p class="distance">' + icon('pin', 14) + '<span>' + text + '</span></p>';
  }
  function updatePosition(force) {
    if (!S.showDistance || !('geolocation' in navigator) || document.visibilityState !== 'visible') return;
    if (!force && updatePosition.at && Date.now() - updatePosition.at < 60000) return;
    updatePosition.at = Date.now();
    navigator.geolocation.getCurrentPosition((pos) => {
      S.myPos = { lat: pos.coords.latitude, lon: pos.coords.longitude, at: Date.now() };
      const typing = document.activeElement && /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName);
      if (!S.dragging && !typing && !S.gate) render();
    }, (err) => {
      if (err && err.code === 1) {  // permission denied
        S.showDistance = false; store.set('showDistance', '0'); S.myPos = null;
        toast('Location is turned off for this app, so distance can\'t be shown.');
        render();
      }
    }, { enableHighAccuracy: false, maximumAge: 120000, timeout: 15000 });
  }

  function weatherLine(homeId) {
    const w = S.weather;
    if (!w || w.homeId !== homeId || w.unit !== S.tempUnit) return '<div class="weather" aria-hidden="true"><span class="wx-placeholder"></span></div>';
    if (w.error) return '';
    if (!w.available) return '<div class="weather wx-missing" title="Add your home\'s address in the Tuya app to see the weather.">No location for weather</div>';
    const [ic, desc] = weatherInfo(w.code, w.isDay);
    return '<div class="weather" aria-label="' + esc(desc + ', ' + w.temp + w.unitLabel) + '"><span class="wx-icon">' + icon(ic, 26) + '</span>' +
      '<span class="wx-text"><span class="wx-temp">' + w.temp + w.unitLabel + '</span><span class="wx-desc">' + desc + '</span></span></div>';
  }
  async function loadWeather(force) {
    if (!S.data || !S.data.homeId) return;
    const homeId = S.data.homeId, w = S.weather;
    if (!force && w && w.homeId === homeId && w.unit === S.tempUnit && Date.now() - w.at < 10 * 60 * 1000) return;
    if (loadWeather.busy) return;
    loadWeather.busy = true;
    try {
      const r = await api('weather?homeId=' + encodeURIComponent(homeId) + '&unit=' + S.tempUnit);
      S.weather = { homeId, unit: S.tempUnit, at: Date.now(), available: !!r.available, temp: r.temp, code: r.code, isDay: r.isDay, unitLabel: r.unit === '°F' ? '°F' : '°C',
        lat: typeof r.lat === 'number' ? r.lat : null, lon: typeof r.lon === 'number' ? r.lon : null };
      updatePosition();
    } catch (e) {
      S.weather = { homeId, unit: S.tempUnit, at: Date.now(), error: true };
    } finally {
      loadWeather.busy = false;
    }
    const typing = document.activeElement && /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName) && document.activeElement.type !== 'range';
    if (!S.dragging && !typing && !S.gate) render();
  }

  function devicesView(selectedId) {
    const data = S.data;
    if (!data) return loadingView();
    const home = (data.homes || []).find((h) => h.id === data.homeId);
    const onCount = data.devices.filter((d) => hasToggle(d) && isOn(d) && d.online).length;
    const roomsWithDevices = (data.rooms || []).filter((r) => data.devices.some((d) => d.room === r));
    const hasOther = roomsWithDevices.length > 0 && data.devices.some((d) => !d.room);
    const rooms = ['All'].concat(roomsWithDevices, hasOther ? ['Other'] : []);
    if (!rooms.includes(S.room)) S.room = 'All';
    const shown = data.devices.filter((d) => S.room === 'All' || (S.room === 'Other' ? !d.room : d.room === S.room));

    const homes = data.homes || [];
    const homeName = home ? home.name : 'My Home';
    const homeLine = homes.length > 1
      ? '<span class="home-pick"><label class="sr-only" for="home-head">Home</label>' +
        '<select id="home-head" class="home-select" data-act="home" data-key="home-head">' +
        homes.map((h) => '<option value="' + esc(h.id) + '"' + (h.id === data.homeId ? ' selected' : '') + '>' + esc(h.name) + '</option>').join('') +
        '</select><span class="title-chevron" aria-hidden="true">' + icon('down', 16) + '</span></span>'
      : '<span>' + esc(homeName) + '</span>';
    const initial = (S.me && S.me.name ? S.me.name : 'H').trim().charAt(0).toUpperCase();
    // The top (greeting, rooms, readings, heading) stays put; only the device cards scroll.
    let html = '<div class="dv-top"><div class="hello">' +
      '<div class="hello-text"><h1 class="title">' + esc(greeting()) + '</h1>' +
      '<p class="hello-sub">' + homeLine + '<span class="hello-dot" aria-hidden="true"></span><span>' + (data.stale ? 'Updating…' : onCount + ' on') + '</span></p>' +
      distanceLine(data.homeId) + '</div>' +
      '<div class="hello-side">' + weatherLine(data.homeId) +
      '<button class="avatar" data-act="tab" data-tab="me" data-key="avatar" aria-label="Me">' + (S.me && !S.me.owner ? esc(initial) : icon('me', 22)) + '</button></div></div>';
    if (S.mode === 'demo') html += '<p class="banner">You are viewing sample devices. Connect your server in Me to control your own.</p>';
    if (rooms.length > 1) {
      html += '<div class="room-tiles" role="group" aria-label="Rooms">' + rooms.map((r) =>
        '<button class="room-tile" data-act="room" data-room="' + esc(r) + '" data-key="room-' + esc(r) + '" aria-pressed="' + (r === S.room) + '">' +
        '<span class="room-box">' + icon(roomIcon(r), 22) + '</span><span class="room-name">' + esc(r) + '</span></button>').join('') + '</div>';
    }
    if (!data.devices.length) {
      return html + '</div><div class="dv-scroll"><div class="empty"><strong>No devices found</strong><p>Link your Tuya app account to your cloud project (see the README), then tap Refresh in Me.</p></div></div>';
    }
    const readings = shown.filter(isReadingDevice);
    const cards = sortByOrder(shown.filter((d) => !isReadingDevice(d)), data.homeId);
    if (readings.length) html += climateSummaries(readings);
    if (cards.length) {
      const arrange = cards.length > 1
        ? '<button class="icon-btn arrange-btn' + (S.reorder ? ' on' : '') + '" data-act="reorder" data-key="reorder" aria-pressed="' + S.reorder + '"' +
          ' aria-label="' + (S.reorder ? 'Done arranging' : 'Arrange devices') + '" title="' + (S.reorder ? 'Done' : 'Arrange devices') + '">' + icon(S.reorder ? 'check' : 'arrange', 20) + '</button>' : '';
      html += '<div class="section-head"><h2>Devices</h2><span class="section-count">' + cards.length + '</span>' + arrange + (S.reorder ? '' : allOffButton()) + '</div>';
      if (S.reorder) html += '<p class="reorder-hint">Drag the handles to move devices, then tap ✓. With a keyboard, focus a handle and use the arrow keys.</p>';
      html += '</div><div class="dv-scroll" data-scroll="devices"><div class="grid' + (S.reorder ? ' reordering' : '') + '">' + cards.map((d) => deviceCard(d, selectedId)).join('') + '</div></div>';
      return html;
    }
    html += '</div><div class="dv-scroll">' + (readings.length ? '' : '<div class="empty"><strong>Nothing in this room</strong><p>Assign devices to rooms in the Tuya app.</p></div>') + '</div>';
    return html;
  }

  function confirmDialog(opts) {
    return new Promise((resolve) => {
      let dlg = document.getElementById('confirm-dialog');
      if (!dlg) {
        dlg = document.createElement('dialog');
        dlg.id = 'confirm-dialog';
        dlg.className = 'confirm';
        dlg.setAttribute('aria-labelledby', 'confirm-title');
        dlg.setAttribute('aria-describedby', 'confirm-body');
        document.body.appendChild(dlg);
      }
      dlg.innerHTML = '<span class="confirm-icon" aria-hidden="true">' + icon(opts.icon || 'power', 26) + '</span>' +
        '<h2 id="confirm-title">' + esc(opts.title) + '</h2>' +
        '<p id="confirm-body">' + esc(opts.body) + '</p>' +
        '<div class="confirm-actions">' +
        '<button class="btn soft-btn" value="cancel">Cancel</button>' +
        '<button class="btn danger-btn" value="ok">' + esc(opts.confirm || 'Confirm') + '</button></div>';
      let done = false;
      const finish = (ok) => {
        if (done) return; done = true;
        if (dlg.open) dlg.close();
        resolve(ok);
      };
      dlg.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => finish(b.value === 'ok')));
      dlg.addEventListener('cancel', () => finish(false), { once: true });   // Escape key
      dlg.addEventListener('click', (e) => { if (e.target === dlg) finish(false); }); // tap outside
      if (typeof dlg.showModal === 'function') {
        dlg.showModal();
        dlg.querySelector('[value="cancel"]').focus();  // safe default for a big action
      } else {
        finish(window.confirm(opts.title + '\n\n' + opts.body));
      }
    });
  }

  function allOffTargets() {
    if (!S.data) return [];
    return S.data.devices.filter((d) => (S.room === 'All' || (S.room === 'Other' ? !d.room : d.room === S.room)) &&
      d.online && hasToggle(d) && isOn(d) && !isReadingDevice(d));
  }
  function allOffButton() {
    const n = allOffTargets().length;
    if (!n) return '';
    const armed = S.allOffArmed && Date.now() - S.allOffArmed < 4000;
    const where = S.room === 'All' ? '' : ' in ' + S.room;
    const label = armed ? 'Tap again to turn off ' + n + ' devices' + where : 'Turn off everything' + where;
    return '<button class="icon-btn power-off' + (armed ? ' armed' : '') + '" data-act="alloff" data-key="alloff" aria-label="' + esc(label) + '" title="' + esc(label) + '">' +
      icon('power', 20) + '</button>';
  }
  function allOff() {
    const targets = allOffTargets();
    if (!targets.length) return;
    if (!(S.allOffArmed && Date.now() - S.allOffArmed < 4000)) {
      S.allOffArmed = Date.now(); render();
      setTimeout(() => { if (S.allOffArmed && Date.now() - S.allOffArmed >= 4000) { S.allOffArmed = 0; render(); } }, 4100);
      return;
    }
    S.allOffArmed = 0;
    render();
    const where = S.room === 'All' || S.room === 'Other' ? '' : ' in ' + S.room;
    const names = targets.slice(0, 3).map((d) => d.name);
    const rest = targets.length - names.length;
    const list = names.length === 1 ? names[0]
      : names.slice(0, -1).join(', ') + (rest ? ', ' + names[names.length - 1] + ' and ' + rest + ' more' : ' and ' + names[names.length - 1]);
    confirmDialog({
      title: S.room === 'All' ? 'Turn off all devices?' : 'Turn off everything' + where + '?',
      body: 'Are you sure? This turns off ' + targets.length + (targets.length === 1 ? ' device: ' : ' devices: ') + list + '.',
      confirm: 'Turn off ' + targets.length
    }).then((ok) => { if (ok) turnOffAll(); });
  }

  function turnOffAll() {
    const targets = allOffTargets();
    if (!targets.length) return;
    targets.forEach((d) => {
      const k = kindOf(d);
      if (k === 'irac') sendIrAc(d, { power: false });
      else if (k === 'multi') {
        const cmds = channelCodes(d).filter((c) => d.status[c]).map((c) => ({ code: c, value: false }));
        send(d, cmds, Object.fromEntries(cmds.map((c) => [c.code, false])));
      } else {
        const pc = powerCode(d);
        if (pc) send(d, [{ code: pc, value: false }], { [pc]: false });
      }
    });
    toast('Turned off ' + targets.length + (targets.length === 1 ? ' device' : ' devices'));
  }

  function loadingView() {
    return '<div class="head"><div><p class="sub">Loading</p><h1 class="title">My Home</h1></div></div>' +
      '<div class="grid" aria-hidden="true">' + '<div class="skeleton"></div>'.repeat(4) + '</div>';
  }

  function rangeControl(id, label, value, min, max, endLow, endHigh, act, dataId) {
    return '<div class="range"><label class="sr-only" for="' + esc(id) + '">' + label + '</label>' +
      '<input id="' + esc(id) + '" type="range" min="' + min + '" max="' + max + '" value="' + value + '" data-act="' + act + '" data-id="' + esc(dataId) + '" data-key="' + esc(id) + '">' +
      '<div class="ends"><span>' + endLow + '</span><span>' + endHigh + '</span></div></div>';
  }

  function powerButton(d) {
    const on = isOn(d), multi = isMulti(d);
    const text = multi ? statusText(d) : (on ? 'On' : 'Off');
    const aria = multi ? (on ? 'Turn all outlets off' : 'Turn all outlets on') : d.name + ' power';
    const busy = isPending(d.id);
    return '<button class="power-btn' + (busy ? ' pending' : '') + '" data-act="toggle" data-id="' + esc(d.id) + '" data-key="pwr-' + esc(d.id) + '" aria-pressed="' + on + '" aria-label="' + esc(aria) + '"' + (busy ? ' aria-busy="true"' : '') + (d.online ? '' : ' disabled') + '>' +
      icon('power', 40) + '<span>' + esc(text) + '</span></button>';
  }

  // Big rocker switch for plain on/off devices (lamps without dimming, plugs, switches): the knob sits
  // at the bottom when off and slides to the top, lit, when on. Tap it, or swipe it up or down.
  const flipped = {};   // id -> time of the last tap, so only a real change animates
  function rockerSwitch(d) {
    const on = isOn(d), busy = isPending(d.id);
    const anim = '';
    return '<div class="rocker-wrap">' +
      '<span class="rocker-state' + (on ? ' on' : '') + '" aria-hidden="true">' + (busy ? (on ? 'Turning on…' : 'Turning off…') : on ? 'On' : 'Off') + '</span>' +
      '<button class="rocker' + anim + (busy ? ' pending' : '') + '" role="switch" aria-checked="' + on + '" aria-label="' + esc(d.name) + '" data-act="toggle" data-id="' + esc(d.id) + '" data-key="rocker-' + esc(d.id) + '"' + (busy ? ' aria-busy="true"' : '') + (d.online ? '' : ' disabled') + '>' +
      '<span class="rocker-knob">' + icon(iconKeyOf(d), 30) + '</span></button></div>';
  }
  // Several switches in one device (2- and 3-gang wall switches, power strips): a rocker for each,
  // like the Home app's switch groups, with "1 On • 2 Off" above and the switch names below.
  function multiRockers(d) {
    const codes = channelCodes(d), n = codes.filter((c) => d.status[c]).length, busy = isPending(d.id);
    // Wall switches get a bulb (they usually run lights); power strips and USB ports get a plug.
    const outlets = ['pc', 'cz'].includes(d.category);
    const items = codes.map((c) => {
      const on = !!d.status[c], key = d.id + ':' + c;
      const glyph = outlets || /usb/.test(c) ? 'plug' : 'light';
      const anim = '';
      const name = channelName(d, c);
      return '<div class="mr-item"><button class="rocker mr' + anim + (busy ? ' pending' : '') + '" role="switch" aria-checked="' + on + '" aria-label="' + esc(name) + '"' +
        ' data-act="toggle" data-id="' + esc(d.id) + '" data-code="' + esc(c) + '" data-key="mr-' + esc(d.id) + '-' + esc(c) + '"' + (d.online ? '' : ' disabled') + '>' +
        '<span class="rocker-knob">' + icon(glyph, 30) + '</span></button>' +
        '<span class="mr-name">' + esc(name) + '</span></div>';
    }).join('');
    return '<div class="mr-wrap">' +
      '<span class="rocker-state' + (n ? ' on' : '') + '">' + n + ' On • ' + (codes.length - n) + ' Off</span>' +
      '<div class="mr-grid' + (codes.length % 2 ? ' odd' : '') + '">' + items + '</div>' +
      '<button class="chip soft mr-all" data-act="toggle" data-id="' + esc(d.id) + '" data-key="mr-all-' + esc(d.id) + '"' + (d.online ? '' : ' disabled') + '>' +
      (n ? 'Turn all off' : 'Turn all on') + '</button></div>';
  }
  let rockerDrag = null;
  document.addEventListener('pointerdown', (e) => {
    const el = e.target.closest && e.target.closest('.rocker');
    if (el && !el.disabled) rockerDrag = { el, y0: e.clientY };
  });
  document.addEventListener('pointerup', (e) => {
    if (!rockerDrag) return;
    const { el, y0 } = rockerDrag; rockerDrag = null;
    const dy = e.clientY - y0, on = el.getAttribute('aria-checked') === 'true';
    if (Math.abs(dy) < 24) return;               // a tap: the click handler toggles it
    el.dataset.swiped = '1';                     // the click that follows is ignored
    if ((dy < 0 && !on) || (dy > 0 && on)) { delete el.dataset.swiped; el.click(); el.dataset.swiped = '1'; }
    setTimeout(() => { delete el.dataset.swiped; }, 400);
  });

  // Brightness dial: an arc from Low (bottom) to High (top), dragged with a finger or the mouse.
  const ARC = { cx: 0, cy: 120, r: 104 };
  function arcPoint(pct) {
    const a = (90 - clamp(pct, 0, 100) * 1.8) * Math.PI / 180;
    return { x: ARC.cx + ARC.r * Math.cos(a), y: ARC.cy + ARC.r * Math.sin(a) };
  }
  function arcPaths(pct) {
    const k = arcPoint(pct);
    return { k, active: 'M ' + ARC.cx + ' ' + (ARC.cy + ARC.r) + ' A ' + ARC.r + ' ' + ARC.r + ' 0 0 0 ' + k.x.toFixed(1) + ' ' + k.y.toFixed(1) };
  }
  function arcDial(d, pct, ready) {
    const p = arcPaths(pct);
    return '<div class="arc-dial" data-id="' + esc(d.id) + '">' +
      '<span class="arc-label hi" aria-hidden="true">High</span><span class="arc-label lo" aria-hidden="true">Low</span>' +
      '<svg viewBox="-6 6 124 228" aria-hidden="true" focusable="false">' +
      '<path class="arc-track" d="M ' + ARC.cx + ' ' + (ARC.cy - ARC.r) + ' A ' + ARC.r + ' ' + ARC.r + ' 0 0 1 ' + ARC.cx + ' ' + (ARC.cy + ARC.r) + '"/>' +
      '<path class="arc-fill" d="' + p.active + '"/>' +
      '<circle class="arc-knob" cx="' + p.k.x.toFixed(1) + '" cy="' + p.k.y.toFixed(1) + '" r="9"/></svg>' +
      '<div class="arc-value"><span class="big" data-live="bright-' + esc(d.id) + '">' + (ready ? pct + '%' : '…') + '</span><span class="big-label">Brightness</span></div>' +
      '</div>';
  }
  function setArcLive(dial, pct) {
    const p = arcPaths(pct);
    dial.querySelector('.arc-fill').setAttribute('d', p.active);
    const knob = dial.querySelector('.arc-knob');
    knob.setAttribute('cx', p.k.x.toFixed(1)); knob.setAttribute('cy', p.k.y.toFixed(1));
    document.querySelectorAll('[data-live="bright-' + CSS.escape(dial.dataset.id) + '"]').forEach((n) => { n.textContent = pct + '%'; });
    document.querySelectorAll('input[data-act="bright"][data-id="' + CSS.escape(dial.dataset.id) + '"]').forEach((n) => { n.value = pct; });
  }
  let arcDrag = null;
  function arcPctFromEvent(dial, e) {
    const svg = dial.querySelector('svg'), box = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const x = vb.x + ((e.clientX - box.left) / box.width) * vb.width;
    const y = vb.y + ((e.clientY - box.top) / box.height) * vb.height;
    const deg = Math.atan2(y - ARC.cy, Math.max(x - ARC.cx, 0.001)) * 180 / Math.PI;
    return clamp(Math.round((90 - deg) / 1.8), 1, 100);
  }
  document.addEventListener('pointerdown', (e) => {
    const dial = e.target.closest && e.target.closest('.arc-dial svg') && e.target.closest('.arc-dial');
    if (!dial) return;
    e.preventDefault();
    arcDrag = { dial, pct: arcPctFromEvent(dial, e) };
    S.dragging = true;
    dial.setPointerCapture && e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId);
    setArcLive(dial, arcDrag.pct);
  });
  document.addEventListener('pointermove', (e) => {
    if (!arcDrag) return;
    arcDrag.pct = arcPctFromEvent(arcDrag.dial, e);
    setArcLive(arcDrag.dial, arcDrag.pct);
  });
  function endArc() {
    if (!arcDrag) return;
    const { dial, pct } = arcDrag;
    arcDrag = null; S.dragging = false;
    const d = findDevice(dial.dataset.id), bc = d && brightCode(d);
    if (!bc) return;
    const cmds = [{ code: bc, value: fromPct(pct, lightRange(d, bc)) }];
    const pc = powerCode(d);
    if (pc && !d.status[pc]) cmds.unshift({ code: pc, value: true });
    send(d, cmds, Object.fromEntries(cmds.map((c) => [c.code, c.value])));
  }
  document.addEventListener('pointerup', endArc);
  // A slider let go without changing value never fires "change"; make sure updates resume anyway.
  ['pointerup', 'pointercancel', 'touchend', 'touchcancel'].forEach((ev) => document.addEventListener(ev, () => {
    setTimeout(() => { if (!arcDrag && S.dragging) { S.dragging = false; render(); } }, 400);
  }, { passive: true }));
  document.addEventListener('pointercancel', endArc);

  function lightModeSeg(d, sfx) {
    const colour = inColour(d);
    return '<div class="seg seg26' + (colour ? ' at-1' : '') + '" style="--n:2" role="group" aria-label="Light mode"><span class="seg26-thumb" aria-hidden="true"></span>' +
      '<button class="chip soft" data-act="lmode" data-val="white" data-id="' + esc(d.id) + '" data-key="lmode-w' + sfx + '" aria-pressed="' + !colour + '">White</button>' +
      '<button class="chip soft" data-act="lmode" data-val="colour" data-id="' + esc(d.id) + '" data-key="lmode-c' + sfx + '" aria-pressed="' + colour + '">Color</button></div>';
  }
  const SWATCHES = [['Red', 0], ['Orange', 28], ['Yellow', 52], ['Green', 120], ['Cyan', 185], ['Blue', 225], ['Purple', 275], ['Pink', 320]];
  // iOS-style: a colour wheel (hue around, saturation outwards), preset swatches and a thick brightness bar.
  function colourControls(d, sfx) {
    const code = colourCode(d), m = colourMax(code), c = currentColour(d);
    const sPct = Math.round((c.s / m.s) * 100), vPct = toPct(c.v, { min: m.vmin, max: m.v });
    const id = esc(d.id) + sfx, did = esc(d.id);
    const [tx, ty] = cwPoint(c.h, sPct);
    const near = (h) => sPct >= 85 && Math.min(Math.abs(c.h - h), 360 - Math.abs(c.h - h)) <= 10;
    return '<div class="colour-ctl cw26" data-id="' + did + '" style="--cw-col:' + hsvCss(c.h, sPct) + ';--cw-v:' + vPct + '%">' +
      '<div class="cw-wheel" data-id="' + did + '" data-key="cw-' + id + '" aria-hidden="true">' +
      '<span class="cw-thumb" style="left:' + tx.toFixed(2) + '%;top:' + ty.toFixed(2) + '%"></span></div>' +
      '<div class="swatches cw-swatches" role="group" aria-label="Colors">' + SWATCHES.map(([n, h]) =>
        '<button class="swatch" style="--sw:' + hsvCss(h, 100) + '" data-act="swatch" data-h="' + h + '" data-id="' + did + '" data-key="sw-' + n + sfx + '" aria-label="' + n + '" aria-pressed="' + near(h) + '"></button>').join('') + '</div>' +
      // Hue and saturation also as (visually hidden) sliders, for keyboards and screen readers.
      '<div class="sr-only"><label for="hue-' + id + '">Hue</label><input id="hue-' + id + '" class="hue-range" type="range" min="0" max="360" value="' + Math.round(c.h) + '" data-act="hue" data-id="' + did + '" data-key="hue-' + id + '">' +
      '<label for="sat-' + id + '">Saturation</label><input id="sat-' + id + '" type="range" min="0" max="100" value="' + sPct + '" data-act="sat" data-id="' + did + '" data-key="sat-' + id + '"></div>' +
      '<div class="cw-bright"><label class="sr-only" for="cv-' + id + '">Brightness</label>' +
      '<input id="cv-' + id + '" class="cw-bar" type="range" min="1" max="100" value="' + vPct + '" data-act="cbright" data-id="' + did + '" data-key="cv-' + id + '">' +
      '<span class="cw-bar-icon" aria-hidden="true">' + icon('sun', 18) + '</span>' +
      '<span class="cw-bar-val" data-colour-label="v" aria-hidden="true">' + vPct + '%</span></div>' +
      '<span class="sr-only" data-colour-label="sat">' + sPct + '%</span>' +
      '</div>';
  }
  // Wheel geometry: hue 0 points right and runs clockwise; saturation is the distance from the centre.
  function cwPoint(h, sPct) {
    const a = h * Math.PI / 180, r = 50 * clamp(sPct, 0, 100) / 100;
    return [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
  }
  function cwRead(wheel, e) {
    const b = wheel.getBoundingClientRect();
    const x = (e.clientX - b.left) / b.width - 0.5, y = (e.clientY - b.top) / b.height - 0.5;
    const h = Math.round(((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360);
    const sPct = Math.round(clamp(Math.hypot(x, y) / 0.5, 0, 1) * 100);
    return { h, sPct };
  }
  // Updates everything on screen while a control moves; the light is told when it stops.
  function colourLive(ctl, d) {
    const r = readColourCtl(ctl, d);
    ctl.style.setProperty('--cw-col', hsvCss(r.h, r.sPct));
    ctl.style.setProperty('--cw-v', r.vPct + '%');
    const t = ctl.querySelector('.cw-thumb');
    if (t) { const [x, y] = cwPoint(r.h, r.sPct); t.style.left = x.toFixed(2) + '%'; t.style.top = y.toFixed(2) + '%'; }
    const sl = ctl.querySelector('[data-colour-label="sat"]'), vl = ctl.querySelector('[data-colour-label="v"]');
    if (sl) sl.textContent = r.sPct + '%';
    if (vl) vl.textContent = r.vPct + '%';
    ctl.querySelectorAll('.swatch').forEach((b) => { const dh = Math.abs(r.h - Number(b.dataset.h)); b.setAttribute('aria-pressed', String(r.sPct >= 85 && Math.min(dh, 360 - dh) <= 10)); });
    return r;
  }
  let cwDrag = null;
  document.addEventListener('pointerdown', (e) => {
    const wheel = e.target.closest && e.target.closest('.cw-wheel');
    if (!wheel || e.button > 0) return;
    const ctl = wheel.closest('.colour-ctl'), d = findDevice(wheel.dataset.id);
    if (!ctl || !d) return;
    e.preventDefault();
    cwDrag = { wheel, ctl, d };
    S.dragging = true;
    wheel.classList.add('dragging');
    try { wheel.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    cwMove(e);
  });
  function cwMove(e) {
    if (!cwDrag) return;
    const { h, sPct } = cwRead(cwDrag.wheel, e);
    cwDrag.ctl.querySelector('[data-act="hue"]').value = h;
    cwDrag.ctl.querySelector('[data-act="sat"]').value = sPct;
    colourLive(cwDrag.ctl, cwDrag.d);
  }
  document.addEventListener('pointermove', cwMove);
  const cwEnd = () => {
    if (!cwDrag) return;
    const { wheel, ctl, d } = cwDrag;
    cwDrag = null; S.dragging = false;
    wheel.classList.remove('dragging');
    sendColour(d, readColourCtl(ctl, d).value);
  };
  document.addEventListener('pointerup', cwEnd);
  document.addEventListener('pointercancel', cwEnd);
  function readColourCtl(ctl, d) {
    const code = colourCode(d), m = colourMax(code);
    const h = Number(ctl.querySelector('[data-act="hue"]').value);
    const sPct = Number(ctl.querySelector('[data-act="sat"]').value);
    const vPct = Number(ctl.querySelector('[data-act="cbright"]').value);
    return { h, sPct, vPct, value: { h, s: Math.round((sPct / 100) * m.s), v: Math.round(m.vmin + (clamp(vPct, 1, 100) / 100) * (m.v - m.vmin)) } };
  }
  function sendColour(d, value) {
    const code = colourCode(d), cmds = [];
    const pc = powerCode(d);
    if (pc && !d.status[pc]) cmds.push({ code: pc, value: true });
    if (d.status.work_mode !== 'colour') cmds.push({ code: 'work_mode', value: 'colour' });
    cmds.push({ code, value });
    send(d, cmds, Object.fromEntries(cmds.map((c) => [c.code, c.value])));
  }

  // ---------- Activity log ----------
  async function loadActivity(more) {
    if (!S.data || !S.data.homeId) return;
    const A = S.activity && S.activity.homeId === S.data.homeId ? S.activity : (S.activity = { homeId: S.data.homeId, entries: [], more: false });
    if (A.loading) return;
    A.loading = true; A.error = '';
    if (!more) render();
    try {
      const before = more && A.entries.length ? A.entries[A.entries.length - 1].at : '';
      const r = await api('activity?homeId=' + encodeURIComponent(A.homeId) + (before ? '&before=' + before : ''));
      A.entries = more ? A.entries.concat(r.entries || []) : (r.entries || []);
      A.more = !!r.more; A.at = Date.now();
    } catch (e) { A.error = e.message; }
    A.loading = false;
    render();
  }
  function dayLabel(ts) {
    const d = new Date(ts), today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.round((today - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
  }
  function activityView() {
    let html = '<div class="detail-head se-head-top"><button class="round-btn" data-act="tab" data-tab="me" data-key="act-back" aria-label="Back to Me">' + icon('back', 20) + '</button>' +
      '<div><p class="sub">Last 30 days</p><h1 class="detail-title">Activity</h1></div></div>';
    if (S.mode !== 'demo' && !S.sync) return html + '<div class="empty"><strong>Needs the database</strong><p>Connect the free Neon database (README, "Sync and users") to keep an activity log.</p></div>';
    const A = S.activity;
    if (!A || A.homeId !== (S.data && S.data.homeId) || (!A.at && !A.loading && !A.error)) { loadActivity(false); return html + '<p class="note" style="text-align:left">Loading…</p>'; }
    if (A.error && !A.entries.length) return html + '<div class="empty"><strong>Couldn\'t load activity</strong><p>' + esc(A.error) + '</p></div>';
    if (!A.entries.length) return html + '<div class="empty"><strong>Nothing yet</strong><p>When anyone controls a device, runs a scene or changes a setting in this app, it shows up here.</p></div>';
    let last = '';
    html += A.entries.map((e) => {
      const day = dayLabel(e.at);
      const head = day !== last ? (last ? '</div>' : '') + '<h2 class="act-day">' + esc(day) + '</h2><div class="list act-list">' : '';
      last = day;
      const time = new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return head + '<div class="list-row act-row"><span class="act-avatar" aria-hidden="true">' + esc((e.who || '?').trim().charAt(0).toUpperCase()) + '</span>' +
        '<span class="act-text"><b>' + esc(e.who) + '</b> ' + esc(e.text) + '</span><span class="act-time">' + time + '</span></div>';
    }).join('') + '</div>';
    if (A.more) html += '<button class="btn ghost act-more" data-act="act-more" data-key="act-more"' + (A.loading ? ' disabled' : '') + '>' + (A.loading ? 'Loading…' : 'Show older') + '</button>';
    html += '<p class="note" style="text-align:left;margin-top:12px">Changes made in the Tuya app or with physical switches aren\'t included.</p>';
    return html;
  }

  function backgroundsView() {
    let html = '<div class="detail-head se-head-top"><button class="round-btn" data-act="tab" data-tab="appearance" data-key="bg-back" aria-label="Back to Appearance">' + icon('back', 20) + '</button>' +
      '<div><p class="sub">Display</p><h1 class="detail-title">Background</h1></div></div>';
    html += '<div class="bg-grid" role="radiogroup" aria-label="Background">' + BACKGROUNDS.map(([v, n]) =>
      '<button class="bg-choice" role="radio" aria-checked="' + (S.bg === v) + '" data-act="bg-set" data-v="' + v + '" data-key="bg-' + v + '">' +
      '<span class="bg-thumb' + (v === 'system' ? ' bg-system' : '') + '"' + (v === 'system' ? '' : ' style="background-image:url(/backgrounds/thumbs/' + v + '.jpg)"') + '>' +
      (S.bg === v ? '<span class="bg-check">' + icon('check', 16) + '</span>' : '') + '</span><span class="bg-name">' + n + '</span></button>').join('') + '</div>';
    html += '<p class="note" style="text-align:left;margin-top:12px">Photo backgrounds use the dark look so text stays readable. Saved on this device.</p>';
    return html;
  }

  function changelogView() {
    let html = '<div class="detail-head se-head-top"><button class="round-btn" data-act="tab" data-tab="about" data-key="cl-back" aria-label="Back to About">' + icon('back', 20) + '</button>' +
      '<div><p class="sub">Version ' + APP_VERSION + '</p><h1 class="detail-title">What\'s new</h1></div></div>';
    html += CHANGELOG.map((c, i) =>
      '<section class="cl-entry"><h2 class="cl-version">' + esc(c.v) + (i === 0 ? '<span class="cl-badge">Current</span>' : '') + '</h2>' +
      '<ul class="cl-list">' + c.items.map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul></section>').join('');
    return html;
  }

  function iconsView() {
    const devices = S.data ? S.data.devices : [];
    let html = '<div class="detail-head se-head-top"><button class="round-btn" data-act="tab" data-tab="me" data-key="icons-back" aria-label="Back to Me">' + icon('back', 20) + '</button>' +
      '<div><p class="sub">Settings</p><h1 class="detail-title">Device icons</h1></div></div>';
    if (!devices.length) return html + '<div class="empty"><strong>No devices yet</strong><p>Devices appear here once they load.</p></div>';
    html += '<div class="list">' + devices.map((d) => {
      const open = S.iconPicking === d.id;
      const current = iconKeyOf(d);
      const label = PHOTOS[current] ? PHOTOS[current].name : (ICON_CHOICES.find(([k]) => k === current) || [current, 'Other'])[1];
      return '<button class="list-row" data-act="icon-open" data-id="' + esc(d.id) + '" data-key="icon-open-' + esc(d.id) + '" aria-expanded="' + open + '" aria-controls="icons-' + esc(d.id) + '">' +
        '<span class="channel"><span class="icon-dot sm">' + deviceIcon(d, 18) + '</span><span class="se-title">' + esc(d.name) +
        '<span class="se-room">' + esc((d.room ? d.room + ', ' : '') + label) + '</span></span></span>' + icon(open ? 'down' : 'chevron', 16) + '</button>' +
        (open ? iconSection(d, '-' + d.id) : '');
    }).join('') + '</div>';
    if (!S.sync) html += '<p class="note" style="text-align:left;margin-top:10px">Icons are saved in this browser. Set up sync to share them across devices.</p>';
    return html;
  }

  function iconSection(d, sfx) {
    const current = iconKeyOf(d);
    let html = '<div>';
    {
      html += '<div class="icon-pick" id="icons' + sfx + '">' +
        '<p class="icon-group">Photos</p>' +
        '<div class="icon-grid photo-grid" role="radiogroup" aria-label="Photo for ' + esc(d.name) + '">' +
        Object.keys(PHOTOS).map((k) =>
          '<button class="icon-choice photo-choice" role="radio" aria-checked="' + (k === current) + '" data-act="icon-set" data-id="' + esc(d.id) + '" data-icon="' + k + '" data-key="icon-' + k + sfx + '">' +
          '<span class="photo-thumb">' + photoImg(PHOTOS[k]) + '</span><span>' + PHOTOS[k].name + '</span></button>').join('') +
        '</div>' +
        '<p class="icon-group">Icons</p>' +
        '<div class="icon-grid" role="radiogroup" aria-label="Icon for ' + esc(d.name) + '">' +
        ICON_CHOICES.map(([k, name]) =>
          '<button class="icon-choice" role="radio" aria-checked="' + (k === current) + '" data-act="icon-set" data-id="' + esc(d.id) + '" data-icon="' + k + '" data-key="icon-' + k + sfx + '">' +
          icon(k, 22) + '<span>' + name + '</span></button>').join('') +
        '</div>' +
        '<div class="icon-actions">' +
        (S.icons[d.id] ? '<button class="chip soft" data-act="icon-reset" data-id="' + esc(d.id) + '" data-key="icon-reset' + sfx + '">Use default</button>' : '') +
        '<button class="chip soft" data-act="icon-open" data-id="' + esc(d.id) + '" data-key="icon-done' + sfx + '">Done</button></div>' +
        '</div>';
    }
    return html + '</div>';
  }

  function irRemotePad(d, sfx) {
    const entry = S.irKeys[d.id];
    if (!entry) { loadIrKeys(d); return '<p class="note">Loading buttons…</p>'; }
    if (entry === 'loading') return '<p class="note">Loading buttons…</p>';
    if (entry.error) {
      return '<p class="note">Couldn\'t load this remote\'s buttons: ' + esc(entry.error) + '</p>' +
        '<button class="chip soft" data-act="irreload" data-id="' + esc(d.id) + '" data-key="irreload' + sfx + '">Try again</button>';
    }
    if (!entry.keys.length) return '<p class="note">This remote has no buttons that can be sent from here.</p>';
    const btn = (k, cls) => {
      const sent = S.irSent[d.id + '|' + k.key];
      return '<button class="' + cls + (sent ? ' sent' : '') + '" data-act="irkey" data-id="' + esc(d.id) + '" data-k="' + esc(k.key) + '" data-key="irk-' + esc(k.key) + sfx + '">' +
        (cls === 'power-btn' ? icon('power', 36) : '') + '<span>' + esc(sent ? 'Sent' : k.name) + '</span></button>';
    };
    const power = entry.keys.filter((k) => /power/i.test(k.key));
    const rest = entry.keys.filter((k) => !/power/i.test(k.key));
    return (power.length ? '<div class="ir-power">' + power.slice(0, 2).map((k) => btn(k, 'power-btn')).join('') + '</div>' : '') +
      (rest.length ? '<div class="ir-keys" role="group" aria-label="Remote buttons">' + rest.map((k) => btn(k, 'chip soft ir-key')).join('') + '</div>' : '') +
      '<p class="note">Each button sends its IR code once, like pressing it on the remote.</p>';
  }

  async function loadIrKeys(d) {
    S.irKeys[d.id] = 'loading';
    try {
      const r = await api('ir?hubId=' + encodeURIComponent(d.ir.hub || 'none') + '&remoteId=' + encodeURIComponent(d.id));
      S.irKeys[d.id] = { keys: r.keys || [], categoryId: r.categoryId };
    } catch (e) {
      S.irKeys[d.id] = { error: e.message };
    }
    if (!S.dragging && !S.renaming) render();
  }

  async function sendIrKey(d, keyName) {
    const entry = S.irKeys[d.id];
    const k = entry && entry.keys && entry.keys.find((x) => x.key === keyName);
    if (!k) return;
    const sentKey = d.id + '|' + k.key;
    try {
      await api('ir', { method: 'POST', body: {
        hubId: d.ir.hub || 'none', remoteId: d.id, action: 'key', homeId: S.data && S.data.homeId, name: d.name,
        categoryId: d.ir.categoryId != null && !Number.isNaN(d.ir.categoryId) ? d.ir.categoryId : (entry.categoryId ?? 0),
        key: k.key, keyId: k.keyId, std: !!k.std
      } });
      S.irSent[sentKey] = true; render();
      setTimeout(() => { delete S.irSent[sentKey]; render(); }, 900);
    } catch (e) {
      toast(k.name + ': ' + e.message);
    }
  }

  // AC over IR: every change sends the full set of settings, debounced for quick taps.
  const irPending = {};
  function sendIrAc(d, patch) {
    const st2 = d.ir.state || (d.ir.state = { power: false, mode: 0, temp: 24, wind: 0 });
    if (!irPending[d.id]) irPending[d.id] = { before: Object.assign({}, st2), changed: new Set() };
    for (const k of Object.keys(patch)) if (st2[k] !== patch[k]) irPending[d.id].changed.add(k);
    if (patch.wind) d.ir.lastWind = patch.wind;
    Object.assign(st2, patch);
    render();
    clearTimeout(irPending[d.id].t);
    irPending[d.id].t = setTimeout(async () => {
      const before = irPending[d.id].before;
      const changed = Array.from(irPending[d.id].changed);
      delete irPending[d.id];
      if (!changed.length) return;
      markPending(d.id, 1); render();
      try {
        await api('ir', { method: 'POST', body: {
          hubId: d.ir.hub || 'none', remoteId: d.id, action: 'ac', homeId: S.data && S.data.homeId, name: d.name,
          power: st2.power ? 1 : 0, mode: st2.mode, temp: st2.temp, wind: st2.wind, changed
        } });
      } catch (e) {
        d.ir.state = before;
        toast(d.name + ': ' + e.message);
      } finally {
        markPending(d.id, -1); render();
      }
    }, 500);
  }

  function channelRow(d, code, sfx) {
    const name = channelName(d, code);
    const rk = esc(d.id) + '-' + esc(code) + sfx;
    if (S.renaming && S.renaming.id === d.id && S.renaming.code === code) {
      return '<form class="list-row rename" data-act="rename-save" data-id="' + esc(d.id) + '" data-code="' + esc(code) + '" novalidate>' +
        '<label class="sr-only" for="rn-' + rk + '">New name for ' + esc(name) + '</label>' +
        '<input id="rn-' + rk + '" name="name" maxlength="40" autocomplete="off" value="' + esc(name) + '" data-key="rn-' + rk + '">' +
        '<button type="submit" class="chip soft" data-key="rn-save-' + rk + '">Save</button>' +
        '<button type="button" class="chip soft" data-act="rename-cancel" data-key="rn-cancel-' + rk + '">Cancel</button></form>';
    }
    // The rockers above switch them; this list is only for names. Tap a row to rename it.
    return '<button class="list-row rename-row" data-act="rename" data-id="' + esc(d.id) + '" data-code="' + esc(code) + '" data-key="rn-edit-' + rk + '" aria-label="Rename ' + esc(name) + '"' + (d.online ? '' : ' disabled') + '>' +
      '<span class="label">' + esc(name) + '</span><span class="value icon-value">' + icon('pencil', 16) + '</span></button>';
  }

  // ---------- Temperature dial (ACs and thermostats) ----------
  // A big reading on the left and a ring of ticks on the right edge. The ticks turn under a fixed
  // pointer: drag them up for warmer, down for cooler (or use the arrow keys or the scroll wheel).
  const TD = { cx: 176, cy: 160, r: 150, deg: 7 };  // ring geometry (SVG units) and degrees per 1°
  function tempUnitOf(sp) {
    const u = String((sp && sp.unit) || '');
    return /f/i.test(u) ? '°F' : /c|℃/i.test(u) || !u ? '°C' : '°';
  }
  const tdFmt = (v) => String(Math.round(v * 10) / 10);
  function tdTicks(m) {
    let out = '';
    for (let v = m.min, i = 0; v <= m.max + 1e-9; v = Math.round((v + 0.5) * 10) / 10, i++) {
      const whole = Math.abs(v - Math.round(v)) < 1e-9;
      const major = whole && Math.round(v) % 5 === 0;
      const len = major ? 22 : whole ? 15 : 9;
      const a = (180 - (v - m.min) * TD.deg) * Math.PI / 180;
      const x1 = TD.cx + TD.r * Math.cos(a), y1 = TD.cy + TD.r * Math.sin(a);
      const x2 = TD.cx + (TD.r + len) * Math.cos(a), y2 = TD.cy + (TD.r + len) * Math.sin(a);
      out += '<line class="' + (major ? 'tk-major' : whole ? 'tk' : 'tk-minor') + '" x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '"/>';
    }
    return out;
  }
  const tdTurn = (m, v) => 'rotate(' + ((v - m.min) * TD.deg).toFixed(2) + ' ' + TD.cx + ' ' + TD.cy + ')';
  function tempDial(d, m) {
    const set = m.set == null ? m.min : clamp(m.set, m.min, m.max);
    const big = m.cur != null ? m.cur : set;
    const cap = m.cur != null ? 'Currently' : m.on ? 'Target' : 'Off';
    let trend = '';
    if (m.on && m.cur != null && Math.abs(set - m.cur) >= 0.5) {
      const up = set > m.cur;
      trend = '<span class="td-trend' + (up ? ' up' : ' down') + '" role="img" aria-label="' + (up ? 'Warming' : 'Cooling') + ' to ' + tdFmt(set) + m.unit + '">' +
        '<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="' + (up ? 'M5 2 L9 8 H1 Z' : 'M5 8 L9 2 H1 Z') + '"/></svg></span>';
    }
    const id = esc(d.id);
    return '<div class="td' + (m.on ? '' : ' is-off') + (m.cur != null ? '' : ' no-cur') + '">' +
      '<div class="td-now"><div class="td-num"><span class="td-big">' + tdFmt(big) + '</span><span class="td-side"><span class="td-unit">' + m.unit + '</span>' + trend + '</span></div>' +
      '<span class="td-cap">' + cap + '</span></div>' +
      '<div class="td-dial" role="slider" tabindex="0" aria-label="Target temperature" aria-valuemin="' + m.min + '" aria-valuemax="' + m.max + '" aria-valuenow="' + set + '"' +
      ' aria-valuetext="' + esc(tdFmt(set) + m.unit + (m.on ? '' : ', off')) + '" data-id="' + id + '" data-act-temp="' + m.act + '"' +
      ' data-min="' + m.min + '" data-max="' + m.max + '" data-step="' + m.step + '" data-value="' + set + '" data-unit="' + esc(m.unit) + '" data-key="tdial-' + id + m.sfx + '"' + (d.online ? '' : ' aria-disabled="true"') + '>' +
      '<span class="td-target"><span class="td-set">' + tdFmt(set) + m.unit + '</span><i aria-hidden="true"></i></span>' +
      '<svg viewBox="0 0 124 320" preserveAspectRatio="xMaxYMid meet" aria-hidden="true" focusable="false">' +
      '<defs><linearGradient id="tdfade-' + id + m.sfx + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.3" stop-color="#fff"/><stop offset="0.7" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '<mask id="tdmask-' + id + m.sfx + '"><rect x="0" y="0" width="124" height="320" fill="url(#tdfade-' + id + m.sfx + ')"/></mask></defs>' +
      '<g mask="url(#tdmask-' + id + m.sfx + ')"><g class="td-ring" transform="' + tdTurn(m, set) + '">' + tdTicks(m) + '</g></g></svg></div></div>';
  }
  function tdModel(el) {
    return { min: Number(el.dataset.min), max: Number(el.dataset.max), step: Number(el.dataset.step) || 1, unit: el.dataset.unit || '°' };
  }
  function tdSnap(m, v) { return clamp(Math.round((v - m.min) / m.step) * m.step + m.min, m.min, m.max); }
  // Moves the ring and the readout without a full render (used while dragging).
  function tdShow(el, v) {
    const m = tdModel(el);
    el.querySelector('.td-ring').setAttribute('transform', tdTurn(m, v));
    const shown = tdSnap(m, v);
    el.querySelector('.td-set').textContent = tdFmt(shown) + m.unit;
    // Without a room reading, the big number is the target itself.
    const td = el.closest('.td');
    if (td && td.classList.contains('no-cur')) td.querySelector('.td-big').textContent = tdFmt(shown);
    el.setAttribute('aria-valuenow', shown);
    el.setAttribute('aria-valuetext', tdFmt(shown) + m.unit);
  }
  function tdCommit(el, v) {
    const d = findDevice(el.dataset.id);
    if (!d || !d.online) return;
    const m = tdModel(el), val = tdSnap(m, v);
    if (el.dataset.actTemp === 'irtemp') {
      if (d.ir) sendIrAc(d, { power: true, temp: val });
      return;
    }
    const sp = specOf(d, 'temp_set');
    const sc = sp && typeof sp.scale === 'number' ? sp.scale : (Math.abs(d.status.temp_set) >= 60 ? 1 : 0);
    const raw = Math.round(val * Math.pow(10, sc));
    if (raw !== d.status.temp_set) sendSoon(d, 'temp_set', raw);
    else render();
  }
  let tdDrag = null;
  // SVG units → screen pixels, so the ticks follow the finger exactly.
  function tdPxPerDegree(el) {
    const svg = el.querySelector('svg'), box = svg.getBoundingClientRect();
    const k = Math.min(box.width / 124, box.height / 320);
    return TD.r * k * TD.deg * Math.PI / 180;
  }
  document.addEventListener('pointerdown', (e) => {
    const el = e.target.closest && e.target.closest('.td-dial');
    if (!el || el.getAttribute('aria-disabled') === 'true') return;
    e.preventDefault();
    el.focus({ preventScroll: true });
    tdDrag = { el, y0: e.clientY, v0: Number(el.dataset.value), v: Number(el.dataset.value), moved: false, px: tdPxPerDegree(el) };
    S.dragging = true;
    el.classList.add('dragging');
    if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
  });
  document.addEventListener('pointermove', (e) => {
    if (!tdDrag) return;
    const dy = tdDrag.y0 - e.clientY;
    if (Math.abs(dy) > 4) tdDrag.moved = true;
    if (!tdDrag.moved) return;
    const m = tdModel(tdDrag.el);
    tdDrag.v = clamp(tdDrag.v0 + dy / tdDrag.px, m.min, m.max);
    tdShow(tdDrag.el, tdDrag.v);
  });
  function tdEnd(e, cancelled) {
    if (!tdDrag) return;
    const { el, moved, v0 } = tdDrag;
    let v = tdDrag.v;
    tdDrag = null; S.dragging = false;
    el.classList.remove('dragging');
    if (cancelled) { tdShow(el, v0); render(); return; }
    if (!moved) {
      // A tap above the pointer warms by one step, below it cools by one.
      const box = el.getBoundingClientRect(), m = tdModel(el);
      v = clamp(v0 + (e.clientY < box.top + box.height / 2 ? m.step : -m.step), m.min, m.max);
    }
    tdShow(el, tdSnap(tdModel(el), v));
    tdCommit(el, v);
  }
  document.addEventListener('pointerup', (e) => tdEnd(e, false));
  document.addEventListener('pointercancel', (e) => tdEnd(e, true));
  document.addEventListener('keydown', (e) => {
    const el = e.target.closest && e.target.closest('.td-dial');
    if (!el || el.getAttribute('aria-disabled') === 'true') return;
    const m = tdModel(el), dir = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
    let v = Number(el.dataset.value);
    if (dir) v += dir * m.step;
    else if (e.key === 'Home') v = m.min;
    else if (e.key === 'End') v = m.max;
    else return;
    e.preventDefault();
    v = tdSnap(m, v); el.dataset.value = v;
    tdShow(el, v); tdCommit(el, v);
  });
  document.addEventListener('wheel', (e) => {
    const el = e.target.closest && e.target.closest('.td-dial');
    if (!el || el.getAttribute('aria-disabled') === 'true' || !e.deltaY) return;
    e.preventDefault();
    const m = tdModel(el), v = tdSnap(m, Number(el.dataset.value) + (e.deltaY < 0 ? m.step : -m.step));
    el.dataset.value = v;
    tdShow(el, v);
    clearTimeout(el._wheel); el._wheel = setTimeout(() => tdCommit(el, v), 250);
  }, { passive: false });

  // AC fan over IR: an Auto button next to a Low–Medium–High slider. The slider looks dimmed while
  // the fan is on Auto (or the AC is off); moving it picks a fixed speed.
  function irFanControl(d, st2, sfx) {
    const id = esc(d.id), auto = st2.wind === 0;
    const level = auto ? (d.ir.lastWind || 2) : st2.wind;
    const label = !st2.power ? 'Off' : auto ? 'Auto' : IR_WIND[st2.wind];
    return '<div class="fan-head"><span class="seg-label">Fan</span><span class="fan-value" data-live="irwind-' + id + '">' + label + '</span></div>' +
      '<div class="fan-row">' +
      '<button class="chip soft fan-auto fan-auto-ico" data-act="irwind" data-v="0" data-id="' + id + '" data-key="irwind-0' + sfx + '" aria-pressed="' + (st2.power && auto) + '" aria-label="Automatic fan speed" title="Automatic fan speed">' + icon('fanauto', 26) + '</button>' +
      '<div class="range fan-range' + (st2.power && !auto ? '' : ' is-auto') + '">' +
      '<label class="sr-only" for="irwind-' + id + sfx + '">Fan speed</label>' +
      '<input id="irwind-' + id + sfx + '" type="range" min="1" max="3" step="1" value="' + level + '" data-act="irwindr" data-id="' + id + '" data-key="irwindr' + sfx + '"' +
      ' aria-valuetext="' + (st2.power && !auto ? IR_WIND[st2.wind] : 'Auto') + '">' +
      '<div class="ends three"><span>Low</span><span>Medium</span><span>High</span></div></div></div>';
  }

  function detailView(d, inPanel) {
    if (!d) return '<div class="empty"><strong>Pick a device</strong><p>Its controls appear here.</p></div>';
    const on = isOn(d);
    const k = kindOf(d), st = d.status;
    const sfx = inPanel ? '-p' : '-d';
    const dis = d.online ? '' : ' disabled';
    let hero = '';
    let heroHasPower = false;

    if (!d.online) {
      hero = '<div class="stack-center"><span class="big mid">Offline</span><span class="big-label">Check its power and Wi-Fi. Controls return when it reconnects.</span></div>';
    } else if (k === 'light' && inColour(d)) {
      hero += lightModeSeg(d, sfx) + colourControls(d, sfx);
    } else if (k === 'light') {
      const bc = brightCode(d), wc = warmCode(d);
      if (colourCode(d)) hero += lightModeSeg(d, sfx);
      if (bc) {
        const pct = toPct(st[bc], lightRange(d, bc));
        hero += arcDial(d, pct, specReady(d)) +
          '<div class="range ticks"><div class="row-between"><label class="se-label" for="bright-' + esc(d.id) + sfx + '">Intensity</label>' +
          '<span class="se-value" data-live="bright-' + esc(d.id) + '">' + pct + '%</span></div>' +
          '<input id="bright-' + esc(d.id) + sfx + '" type="range" min="1" max="100" value="' + pct + '" data-act="bright" data-id="' + esc(d.id) + '" data-key="bright-' + esc(d.id) + sfx + '">' +
          '<div class="tick-row" aria-hidden="true">' + '<span></span>'.repeat(7) + '</div>' +
          '<div class="ends"><span>Off</span><span>100%</span></div></div>';
      } else {
        hero += rockerSwitch(d); heroHasPower = true;
      }
      if (wc) {
        const pct = toPct(st[wc], lightRange(d, wc, true));
        const presets = [['Warm', 1], ['Neutral', 50], ['Cool', 100]];
        hero += '<div class="seg" style="--n:3" role="group" aria-label="Color temperature">' + presets.map(([n, p]) =>
          '<button class="chip soft" data-act="warmth" data-id="' + esc(d.id) + '" data-pct="' + p + '" data-key="warm-' + n + sfx + '" aria-pressed="' + (Math.abs(pct - p) <= 12) + '">' + n + '</button>').join('') + '</div>';
      }
    } else if (k === 'climate' && 'temp_set' in st) {
      hero += acPage(d, sfx);
    } else if (k === 'cover') {
      const p = st.percent_control ?? st.percent_state;
      hero += '<div class="stack-center"><span class="big" data-live="cover-' + esc(d.id) + '">' + (typeof p === 'number' ? p + '%' : '–') + '</span><span class="big-label">Open</span></div>';
      if ('percent_control' in st) hero += rangeControl('cover-' + d.id + sfx, 'Position', p || 0, 0, 100, 'Closed', 'Open', 'coverpos', d.id);
      if ('control' in st) {
        hero += '<div class="seg" style="--n:3" role="group" aria-label="Move">' + [['open', 'Open'], ['stop', 'Stop'], ['close', 'Close']].map(([v, n]) =>
          '<button class="chip soft" data-act="cover" data-id="' + esc(d.id) + '" data-val="' + v + '" data-key="cov-' + v + sfx + '">' + n + '</button>').join('') + '</div>';
      }
    } else if (k === 'fan' && typeof st.fan_speed_percent === 'number') {
      hero += '<div class="stack-center"><span class="big" data-live="fan-' + esc(d.id) + '">' + st.fan_speed_percent + '%</span><span class="big-label">Fan speed</span></div>' +
        rangeControl('fan-' + d.id + sfx, 'Fan speed', st.fan_speed_percent, 1, 100, 'Slow', 'Fast', 'fanspeed', d.id);
    } else if (k === 'sensor') {
      hero += '<div class="stack-center"><span class="big mid">' + esc(sensorReading(d)) + '</span><span class="big-label">Current reading</span></div>';
    } else if (k === 'camera') {
      hero += '<div class="stack-center"><span class="icon-dot" style="width:72px;height:72px;border-radius:36px">' + icon('camera', 32) + '</span>' +
        '<p class="note">Live video is not available in this app yet. Open the camera in the Tuya app to watch.</p></div>';
    } else if (k === 'irac') {
      hero += acPage(d, sfx);
    } else if (k === 'irremote') {
      hero += irRemotePad(d, sfx);
    } else if (k === 'multi') {
      hero += multiRockers(d); heroHasPower = true;
    } else if (powerCode(d)) {
      hero += rockerSwitch(d); heroHasPower = true;
    } else {
      hero += '<div class="stack-center"><span class="big mid">Online</span><span class="big-label">This app does not have controls for this device type yet.</span></div>';
    }

    const rows = [];
    const nameRows = k === 'multi' && d.online ? channelCodes(d).map((c) => channelRow(d, c, sfx)) : [];
    if (hasToggle(d) && !heroHasPower) {
      rows.push('<div class="list-row"><span class="label">Power</span>' + switchBtn(d, sfx) + '</div>');
    }
    if (k === 'sensor') {
      const tt = scaled(d, 'va_temperature', true), hh = scaled(d, 'va_humidity', false);
      if (tt != null) rows.push('<div class="list-row"><span class="label">Temperature</span><span class="value">' + fmtReading(tt) + '</span></div>');
      if (hh != null) rows.push('<div class="list-row"><span class="label">Humidity</span><span class="value">' + Math.round(hh) + '%</span></div>');
    }
    if (typeof st.battery_percentage === 'number') rows.push('<div class="list-row"><span class="label">Battery</span><span class="value">' + st.battery_percentage + '%</span></div>');
    if (d.ir && d.ir.brand) rows.push('<div class="list-row"><span class="label">Brand</span><span class="value">' + esc(d.ir.brand) + '</span></div>');
    else rows.push('<div class="list-row"><span class="label">Model</span><span class="value">' + esc(d.product || d.category) + '</span></div>');

    return '<div class="detail">' +
      '<div class="detail-head">' +
      (inPanel ? '' : '<button class="round-btn" data-act="back" data-key="back" aria-label="Back to devices">' + icon('back', 20) + '</button>') +
      '<span class="icon-dot head-icon">' + deviceIcon(d) + '</span>' +
      '<div><p class="sub">' + esc((d.room || 'No room') + (d.ir && d.ir.brand ? ', ' + d.ir.brand : '')) + '</p><h2 class="detail-title">' + esc(d.name) + '</h2></div></div>' +
      // AC and thermostat screens skip the photo: the temperature dial is the picture there.
      '<div class="hero">' + (photoOf(d) && hero.indexOf('<div class="td') === -1 ? '<div class="hero-photo ' + (on && d.online ? 'lit' : 'dim') + '" style="--glow-color:' + photoGlow(d) + '">' + photoImg(photoOf(d)) + '</div>' : '') + hero + '</div>' +
      (nameRows.length ? '<h3 class="section-title">Switch names</h3><div class="list names-list">' + nameRows.join('') + '</div>' : '') +
      '<div class="list">' + rows.join('') + '</div>' +
      (d.online ? timerSection(d) : '') +
      (d.online ? energySection(d) : '') +
      '</div>';
  }

  // ---------- Plain-language summaries of scenes and automations ----------
  // "Ceiling light off · Floor lamp on, 29%, warm" and "Every day at 7:00 PM → Porch light on".
  function propsPhrase(d, p) {
    p = p || {};
    const bits = [], keys = Object.keys(p);
    const sw = keys.filter((k) => /^switch(_led|_\d+|_usb\d+)?$/.test(k) && typeof p[k] === 'boolean');
    if (sw.length > 1) {
      const on = sw.filter((k) => p[k]).length;
      bits.push(on === sw.length ? 'all on' : on === 0 ? 'all off' : on + ' of ' + sw.length + ' on');
    } else if (sw.length === 1) {
      const k = sw[0], named = d && /_(usb)?\d+$/.test(k) && isMulti(d);
      bits.push((named ? channelName(d, k) + ' ' : '') + (p[k] ? 'on' : 'off'));
    }
    if (typeof p.switch === 'boolean' && !sw.includes('switch')) bits.push(p.switch ? 'on' : 'off');
    const bc = ['bright_value_v2', 'bright_value'].find((c) => typeof p[c] === 'number');
    if (bc && d) bits.push(toPct(p[bc], lightRange(d, bc)) + '%');
    const wc = ['temp_value_v2', 'temp_value'].find((c) => typeof p[c] === 'number');
    if (wc && d) { const w = toPct(p[wc], lightRange(d, wc, true)); bits.push(w <= 33 ? 'warm' : w >= 67 ? 'cool' : 'neutral'); }
    if ('colour_data_v2' in p || 'colour_data' in p) bits.push('colour');
    if (typeof p.temp_set === 'number' && d) bits.push(fmtTemp(seTempValue(d, p.temp_set)));
    if (typeof p.mode === 'string') bits.push(modeLabel(p.mode).toLowerCase());
    if (p.control === 'open' || p.control === 'close' || p.control === 'stop') bits.push(p.control);
    if (typeof p.percent_control === 'number') bits.push(p.percent_control + '% open');
    if (typeof p.fan_speed_percent === 'number') bits.push('fan ' + p.fan_speed_percent + '%');
    // IR remotes (standard instructions)
    if ('PowerOff' in p) bits.push('off');
    else if ('PowerOn' in p || 'T' in p || 'M' in p) bits.push('on');
    if ('T' in p && !('PowerOff' in p)) bits.push(p.T + '°');
    if ('M' in p && !('PowerOff' in p) && IR_MODES[Number(p.M)]) bits.push(IR_MODES[Number(p.M)].toLowerCase());
    if ('F' in p && !('PowerOff' in p) && IR_WIND[Number(p.F)]) bits.push('fan ' + IR_WIND[Number(p.F)].toLowerCase());
    const irKey = typeof p.key === 'string' ? p.key : (keys.length === 1 && d && d.ir && !d.ir.ac && !bits.length ? keys[0] : null);
    if (irKey) bits.push('press ' + irKey);
    return bits.length ? bits.join(', ') : 'changes';
  }
  function waitPhrase(p) {
    const h = Number(p && p.hours) || 0, m = Number(p && p.minutes) || 0, sec = Number(p && p.seconds) || 0;
    const parts = [];
    if (h) parts.push(h + ' h'); if (m) parts.push(m + ' min'); if (sec) parts.push(sec + ' s');
    return 'wait ' + (parts.join(' ') || '0 s');
  }
  // step: { executor, entity, props } (the shape scenes use)
  function stepPhrase(step) {
    const ex = step.executor, props = step.props || {};
    if (ex === 'delay') return waitPhrase(props);
    if (ex === 'ruleTrigger') {
      const sc = S.data && S.data.scenes.find((x) => x.id === step.entity);
      return sc ? 'run “' + sc.name + '”' : 'run a scene';
    }
    if (ex === 'ruleEnable' || ex === 'ruleDisable') {
      const au = S.data && S.data.automations.find((x) => x.id === step.entity);
      return (ex === 'ruleEnable' ? 'turn on ' : 'turn off ') + (au ? '“' + au.name + '”' : 'an automation');
    }
    const d = step.entity ? findDevice(step.entity) : null;
    if (!d && !step.entity) return 'an action from the Tuya app';
    return (d ? d.name : 'a removed device') + ' ' + propsPhrase(d, props);
  }
  function stepsPhrase(steps, max) {
    const list = (steps || []).map(stepPhrase);
    if (!list.length) return 'Does nothing yet';
    const shown = list.slice(0, max || 3);
    const s = shown.join(' · ') + (list.length > shown.length ? ' · +' + (list.length - shown.length) + ' more' : '');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function daysPhrase(loops) {
    const l = String(loops || '');
    if (!/^[01]{7}$/.test(l) || l === '1111111') return 'Every day';
    if (l === '0000000') return 'Once';
    if (l === '0111110') return 'Weekdays';
    if (l === '1000001') return 'Weekends';
    return l.split('').map((x, i) => (x === '1' ? DAY_NAMES[i].slice(0, 3) : null)).filter(Boolean).join(', ');
  }
  function clockPhrase(t) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || ''));
    if (!m) return String(t || '');
    try { return new Date(2000, 0, 1, Number(m[1]), Number(m[2])).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
    catch (e) { return m[0]; }
  }
  // One-off schedules: Tuya stores the date as YYYYMMDD; the date picker uses YYYY-MM-DD.
  function isoDate(t) { const m = /^(\d{4})-?(\d{2})-?(\d{2})$/.exec(String(t || '')); return m ? m[1] + '-' + m[2] + '-' + m[3] : ''; }
  function datePhrase(t) {
    const iso = isoDate(t);
    if (!iso) return String(t || '');
    const [y, mo, d] = iso.split('-').map(Number), dt = new Date(y, mo - 1, d), now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()), diff = Math.round((dt - today) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    try { return dt.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: y === now.getFullYear() ? undefined : 'numeric' }); }
    catch (e) { return iso; }
  }
  function isOnceTimer(disp) { const l = String((disp && disp.loops) || ''); return !!(disp && isoDate(disp.date)) && (l === '' || l === '0000000'); }
  function onceIsPast(date, time) {
    const iso = isoDate(date), m = /^(\d{1,2}):(\d{2})$/.exec(String(time || ''));
    if (!iso || !m) return false;
    const [y, mo, d] = iso.split('-').map(Number);
    return new Date(y, mo - 1, d, Number(m[1]), Number(m[2])) < new Date();
  }
  // Weather conditions (Tuya type 3): sunrise/sunset, outside temperature, humidity, weather...
  // They belong to a city (Tuya's city ID), shown with its name, e.g. "TangerangSelatan" → "Tangerang Selatan".
  function cityLabel(n) { return String(n || '').replace(/([a-z])([A-Z])/g, '$1 $2').trim(); }
  const WX_SKY = [['sunny', 'Sunny'], ['cloudy', 'Cloudy'], ['rainy', 'Rainy'], ['snowy', 'Snowy'], ['polluted', 'Hazy']];
  const WX_HUM = [['dry', 'Dry'], ['comfortable', 'Comfortable'], ['humid', 'Humid']];
  const opWord = (op) => (op === '>' ? 'above' : op === '<' ? 'below' : 'is');
  function weatherPhrase(disp) {
    const v = disp.value, code = String(disp.code || '');
    const pick = (list) => { const f = list.find(([k]) => k === v); return f ? f[1].toLowerCase() : String(v); };
    if (code === 'sunsetrise') return v === 'sunrise' ? 'At sunrise' : v === 'sunset' ? 'At sunset' : 'At sunrise or sunset';
    if (code === 'temp') return 'Outside ' + opWord(disp.operator) + ' ' + v + '°';
    if (code === 'humidity') return 'Outside air is ' + pick(WX_HUM);
    if (code === 'condition') return 'Weather turns ' + pick(WX_SKY);
    if (code === 'pm25') return 'Outdoor PM2.5 is ' + v;
    if (code === 'aqi') return 'Outdoor air quality is ' + v;
    if (code === 'windSpeed') return 'Wind speed ' + opWord(disp.operator) + ' ' + v;
    return 'The weather changes';
  }
  function weatherIcon(disp) {
    const code = String(disp.code || '');
    if (code === 'sunsetrise') return disp.value === 'sunrise' ? 'sunrise' : 'sunset';
    if (code === 'temp') return 'thermo';
    if (code === 'humidity') return 'drop';
    if (code === 'condition') return disp.value === 'rainy' ? 'rain' : disp.value === 'snowy' ? 'snow' : disp.value === 'cloudy' ? 'cloud' : 'sun';
    return 'cloudsun';
  }
  // The city for new sunrise/sunset conditions: one this home already uses, else Tuya's city for the home's location.
  async function automationCity() {
    const E = S.editor, homeId = S.data.homeId;
    const mine = E && E.conditions.find((c) => c.type === 'weather' && c.cityId);
    if (mine) return { cityId: mine.cityId, cityName: mine.cityName };
    for (const a of S.data.automations || []) for (const c of a.conditions || []) {
      if (Number(c.entity_type) === 3 && c.entity_id) return { cityId: String(c.entity_id), cityName: c.entity_name || '' };
    }
    if (S.cityCache && S.cityCache.homeId === homeId) return S.cityCache;
    const r = await api('automation-edit?homeId=' + encodeURIComponent(homeId) + '&city=1');
    S.cityCache = { homeId, cityId: String(r.cityId), cityName: r.cityName || '' };
    return S.cityCache;
  }
  // Copy the shape Tuya used for an existing sunrise/sunset condition, if there is one.
  function sunTemplate() {
    for (const a of S.data.automations || []) for (const c of a.conditions || []) {
      if (Number(c.entity_type) === 3 && c.display && c.display.code === 'sunsetrise') return Object.assign({}, c.display);
    }
    return { code: 'sunsetrise', operator: '==', value: 'sunset' };
  }
  // c: a Tuya condition { entity_type, entity_id, display }
  function conditionPhrase(c) {
    const t = Number(c.entity_type), disp = c.display || {};
    if (t === 6) return isOnceTimer(disp) ? 'Once, ' + datePhrase(disp.date) + ' at ' + clockPhrase(disp.time) : daysPhrase(disp.loops) + ' at ' + clockPhrase(disp.time);
    if (t === 3) return weatherPhrase(disp);
    if (t === 15) return 'An outside trigger fires';
    const d = findDevice(c.entity_id);
    if (!d) return 'A device changes';
    const opt = triggerOptions(d).find((o) => o.code === disp.code && o.op === disp.operator && (o.thresh || o.value === disp.value));
    if (!opt) return d.name + ' changes';
    if (opt.thresh) {
      const v = Number(disp.value) / Math.pow(10, codeScale(d, opt.code, opt.thresh === 'temp'));
      return d.name + ' ' + opt.label.toLowerCase() + ' ' + (Math.round(v * 10) / 10) + (opt.thresh === 'temp' ? '°' : '%');
    }
    return d.name + ' ' + opt.label.charAt(0).toLowerCase() + opt.label.slice(1);
  }
  function automationPhrase(a) {
    const conds = a.conditions || [], acts = a.actions || [];
    if (!conds.length && !acts.length) return '';
    const when = conds.map(conditionPhrase).join(Number(a.match_type) === 2 ? ' and ' : ' or ');
    const then = stepsPhrase(acts.map((x) => ({ executor: x.action_executor, entity: x.entity_id || '', props: x.executor_property || {} })), 2);
    return (when || 'Sometimes') + ' → ' + then;
  }

  function scenesView(withAutomations) {
    const data = S.data;
    if (!data) return loadingView();
    let html = '<div class="head"><div><p class="sub">Tap a scene to run it</p><h1 class="title">Scenes</h1></div>' +
      (canEdit() ? '<button class="pill-btn" data-act="scene-new" data-key="scene-new">' + icon('plus', 18) + 'New scene</button>' : '') + '</div>';
    if (!data.scenes.length) {
      html += '<div class="empty"><strong>No tap-to-run scenes yet</strong><p>Tap New scene to make one. Scenes you create in the Tuya app show up here too.</p></div>';
    } else {
      html += '<div class="grid">' + data.scenes.map((s) => {
        const state = S.sceneState[s.id];
        const meta = state === 'running' ? 'Running…' : state === 'done' ? 'Done' : stepsPhrase(s.steps);
        return '<div class="scene-wrap"><button class="scene ' + (state || '') + '" data-act="scene" data-id="' + esc(s.id) + '" data-key="scene-' + esc(s.id) + '"' + (state === 'running' ? ' disabled' : '') + '>' +
          '<span class="icon-dot">' + icon(state === 'done' ? 'check' : 'play', 16) + '</span>' +
          '<span><span class="name">' + esc(s.name) + '</span><span class="meta scene-sum">' + esc(meta) + '</span></span></button>' +
          (!canEdit() ? '' : '<button class="scene-edit edit-btn" data-act="scene-open" data-id="' + esc(s.id) + '" data-key="scene-edit-' + esc(s.id) + '" aria-label="Edit ' + esc(s.name) + '">' + icon('pencil', 16) + '</button>') + '</div>';
      }).join('') + '</div>';
    }
    if (withAutomations) html += '<div class="section-head" style="margin-top:28px"><h2>Automations</h2>' + newAutoButton() + '</div>' + automationsList();
    return html;
  }

  const canEdit = () => S.mode === 'demo' || !S.me || S.me.role === 'admin';

  // ---------- Scene editor ----------
  const SCENE_KINDS = ['light', 'plug', 'multi', 'climate', 'cover', 'fan', 'generic', 'irac', 'irremote'];
  function sceneEligible(d) {
    const k = kindOf(d);
    if (!SCENE_KINDS.includes(k)) return false;
    if (k === 'generic') return !!powerCode(d);
    if (k === 'cover') return 'control' in d.status || 'percent_control' in d.status;
    return true;
  }
  function defaultProps(d) {
    const k = kindOf(d), pc = powerCode(d), p = {};
    if (k === 'irac') return { PowerOn: 'PowerOn', M: 0, T: 24, F: 0 };
    if (k === 'irremote') return {};  // pick a button first
    if (k === 'multi') { channelCodes(d).forEach((c) => { p[c] = true; }); return p; }
    if (k === 'cover') { if ('control' in d.status) p.control = 'open'; else p.percent_control = 100; return p; }
    if (pc) p[pc] = true;
    return p;
  }
  function stepsToItems(steps) {
    return (steps || []).map((a) => {
      if (a.executor === 'delay') {
        const p = a.props || {};
        return { type: 'delay', minutes: Number(p.hours || 0) * 60 + Number(p.minutes || 0), seconds: Number(p.seconds || 0) };
      }
      if (a.executor === 'ruleTrigger' && S.data && S.data.scenes.some((x) => x.id === a.entity)) return { type: 'scene', sceneId: a.entity };
      const d = (a.executor === 'dpIssue' || a.executor === 'device_issue' || a.executor === 'irIssue') ? findDevice(a.entity) : null;
      // IR actions stay editable only when they're in the simple form this app writes; anything else
      // (e.g. made in the Tuya app) is kept exactly as is.
      if (d && d.ir) {
        const keys = Object.keys(a.props || {});
        const acForm = d.ir.ac && keys.length && keys.every((k) => ['PowerOn', 'PowerOff', 'T', 'M', 'F'].includes(k));
        const keyForm = !d.ir.ac && keys.length === 1 && a.props[keys[0]] === keys[0];
        if (!(acForm || keyForm) || (a.executor === 'irIssue' && !acForm && !keyForm)) {
          return { type: 'raw', raw: { action_executor: a.executor, entity_id: a.entity, executor_property: a.props || {} } };
        }
      }
      if (d && sceneEligible(d)) return { type: 'device', deviceId: d.id, props: Object.assign({}, a.props) };
      return { type: 'raw', raw: { action_executor: a.executor, entity_id: a.entity || undefined, executor_property: a.props || {} } };
    });
  }
  function openEditor(id) {
    if (!S.data) return;
    const sc = id === 'new' ? null : S.data.scenes.find((x) => x.id === id);
    S.editor = {
      kind: 'scene', routeId: id, id: sc ? sc.id : null, name: sc ? sc.name : '',
      background: sc ? sc.background : ((S.data.scenes.find((x) => x.background) || {}).background || ''),
      items: sc ? stepsToItems(sc.steps) : [], picking: !sc, saving: false, confirmDelete: false, error: ''
    };
    S.editor.items.forEach((it) => { if (it.type === 'device' && !S.specs[it.deviceId]) loadSpec(it.deviceId, true); });
    S.editor.snap = editorSnap(S.editor);
  }

  // Unsaved changes: the editor compares what's on screen with how it was when opened.
  function editorSnap(E) { return JSON.stringify([E.name.trim(), E.items, E.conditions || [], E.match || 1]); }
  function editorDirty() { const E = S.editor; return !!E && !E.saving && !E.loading && E.snap !== undefined && editorSnap(E) !== E.snap; }
  async function leaveEditor(target) {
    const E = S.editor;
    if (editorDirty()) {
      const noun = E.kind === 'auto' ? 'automation' : 'scene';
      const ok = await confirmDialog({ icon: 'pencil', title: 'Discard changes?', body: 'Your changes to this ' + noun + ' haven\'t been saved.', confirm: 'Discard' });
      if (!ok) return;
    }
    S.editor = null; go(target);
  }
  window.addEventListener('beforeunload', (e) => { if (inEditor() && editorDirty()) { e.preventDefault(); e.returnValue = ''; } });

  function seChips(i, code, options, current) {
    return '<div class="seg" style="--n:' + options.length + '">' + options.map(([label, val]) => {
      const pressed = val === 'keep' ? current === undefined : current === val;
      return '<button class="chip soft" data-act="se-prop" data-i="' + i + '" data-code="' + esc(code) + '" data-val="' + esc(JSON.stringify(val)) + '" data-key="se-' + i + '-' + esc(code) + '-' + esc(String(val)) + '" aria-pressed="' + pressed + '">' + label + '</button>';
    }).join('') + '</div>';
  }
  function seRange(i, code, pct, low, high, label) {
    const id = 'se-r-' + i + '-' + code;
    return '<div class="range"><div class="row-between"><label class="se-label" for="' + esc(id) + '">' + label + '</label>' +
      '<span class="se-value" data-live="se-' + i + '-' + esc(code) + '">' + pct + '%</span></div>' +
      '<input id="' + esc(id) + '" type="range" min="1" max="100" value="' + pct + '" data-act="se-range" data-i="' + i + '" data-code="' + esc(code) + '" data-key="' + esc(id) + '">' +
      '<div class="ends"><span>' + low + '</span><span>' + high + '</span></div></div>';
  }
  function seTempValue(d, raw) {
    const sp = specOf(d, 'temp_set');
    const scale = sp && typeof sp.scale === 'number' ? sp.scale : (Math.abs(raw) >= 60 ? 1 : 0);
    return raw / Math.pow(10, scale);
  }

  // IR remotes in scenes and automations use Tuya's standard IR instructions.
  function loadIrSpec(d) {
    if (S.irSpecs[d.id]) return;
    S.irSpecs[d.id] = 'loading';
    api('irspec?deviceId=' + encodeURIComponent(d.id))
      .then((r) => { S.irSpecs[d.id] = r; })
      .catch(() => { S.irSpecs[d.id] = { available: false }; })
      .then(() => { if (!S.dragging) render(); });
  }
  function irActionControls(d, it, i) {
    const p = it.props;
    if (kindOf(d) === 'irac') {
      const on = !('PowerOff' in p);
      let html = '<div class="seg" style="--n:2">' +
        '<button class="chip soft" data-act="se-ir-power" data-i="' + i + '" data-v="1" data-key="se-' + i + '-iron" aria-pressed="' + on + '">On</button>' +
        '<button class="chip soft" data-act="se-ir-power" data-i="' + i + '" data-v="0" data-key="se-' + i + '-iroff" aria-pressed="' + !on + '">Off</button></div>';
      if (on) {
        const t = Number(p.T != null ? p.T : 24);
        html += '<div class="se-row"><span class="se-label">Temperature</span><div class="stepper">' +
          '<button class="round-btn soft sm" data-act="se-irtemp" data-i="' + i + '" data-delta="-1" data-key="se-' + i + '-irtd" aria-label="Lower temperature">' + icon('minus', 18) + '</button>' +
          '<span class="se-value">' + t + '°</span>' +
          '<button class="round-btn soft sm" data-act="se-irtemp" data-i="' + i + '" data-delta="1" data-key="se-' + i + '-irtu" aria-label="Raise temperature">' + icon('plus', 18) + '</button></div></div>';
        html += '<div class="se-row"><span class="se-label">Mode</span>' + seChips(i, 'M', IR_MODES.map((m, n) => [m, n]), Number(p.M != null ? p.M : 0)) + '</div>';
        html += '<div class="se-row"><span class="se-label">Fan</span>' + seChips(i, 'F', IR_WIND.map((w, n) => [w, n]), Number(p.F != null ? p.F : 0)) + '</div>';
      }
      return html;
    }
    // Other IR remotes (TV, fan, light...): pick one button to press.
    const spec = S.irSpecs[d.id];
    if (!spec) { loadIrSpec(d); return '<p class="note se-note">Loading buttons…</p>'; }
    if (spec === 'loading') return '<p class="note se-note">Loading buttons…</p>';
    let keys = spec.available && spec.functions && spec.functions.length ? spec.functions.map((f) => ({ code: f.code, name: f.name })) : null;
    if (!keys) {
      const entry = S.irKeys[d.id];
      if (!entry) { loadIrKeys(d); return '<p class="note se-note">Loading buttons…</p>'; }
      if (entry === 'loading') return '<p class="note se-note">Loading buttons…</p>';
      keys = (entry.keys || []).map((k) => ({ code: k.key, name: k.name }));
    }
    if (!keys.length) return '<p class="note se-note">This remote has no buttons that can be used here.</p>';
    const current = Object.keys(p)[0];
    return '<div class="se-row"><span class="se-label">Press</span><div class="trigger-chips" role="group" aria-label="Button to press">' + keys.slice(0, 40).map((k, j) =>
      '<button class="chip soft" data-act="se-irkey" data-i="' + i + '" data-k="' + esc(k.code) + '" data-key="se-' + i + '-k' + j + '" aria-pressed="' + (current === k.code) + '">' + esc(k.name) + '</button>').join('') + '</div></div>';
  }

  function deviceActionControls(it, i) {
    const d = findDevice(it.deviceId), p = it.props, k = kindOf(d), pc = powerCode(d);
    if (d.ir) return irActionControls(d, it, i);
    const OnOff = [['On', true], ['Off', false]];
    let html = '';
    if (k === 'multi') {
      html += channelCodes(d).map((c) => '<div class="se-row"><span class="se-label">' + esc(channelName(d, c)) + '</span>' +
        seChips(i, c, [['Keep', 'keep'], ['On', true], ['Off', false]], p[c]) + '</div>').join('');
      return html;
    }
    if (k === 'cover') {
      if ('control' in d.status) return seChips(i, 'control', [['Open', 'open'], ['Stop', 'stop'], ['Close', 'close']], p.control);
      return seRange(i, 'percent_control', clamp(Number(p.percent_control ?? 100), 1, 100), 'Closed', 'Open', 'Position');
    }
    if (pc) html += seChips(i, pc, OnOff, p[pc]);
    const on = !pc || p[pc] !== false;
    if (k === 'light' && on) {
      const bc = brightCode(d), wc = warmCode(d);
      if (bc) {
        const r = lightRange(d, bc);
        html += p[bc] === undefined
          ? '<button class="chip soft se-add" data-act="se-prop" data-i="' + i + '" data-code="' + esc(bc) + '" data-val="' + fromPct(100, r) + '" data-key="se-' + i + '-addbright">Set brightness</button>'
          : seRange(i, bc, toPct(p[bc], r), 'Low', 'High', 'Brightness');
      }
      if (wc) {
        const r = lightRange(d, wc, true);
        const cur = p[wc] === undefined ? 'keep' : toPct(p[wc], r);
        html += '<div class="seg" style="--n:4" role="group" aria-label="Color temperature">' + [['Keep', 'keep'], ['Warm', 1], ['Neutral', 50], ['Cool', 100]].map(([label, v]) => {
          const val = v === 'keep' ? 'keep' : fromPct(v, r);
          const pressed = v === 'keep' ? cur === 'keep' : cur !== 'keep' && Math.abs(cur - v) <= 12;
          return '<button class="chip soft" data-act="se-prop" data-i="' + i + '" data-code="' + esc(wc) + '" data-val="' + esc(JSON.stringify(val)) + '" data-key="se-' + i + '-warm-' + label + '" aria-pressed="' + pressed + '">' + label + '</button>';
        }).join('') + '</div>';
      }
    }
    if (k === 'climate' && on && 'temp_set' in d.status) {
      const raw = p.temp_set ?? d.status.temp_set;
      html += '<div class="se-row"><span class="se-label">Temperature</span><div class="stepper">' +
        '<button class="round-btn soft sm" data-act="se-temp" data-i="' + i + '" data-delta="-1" data-key="se-' + i + '-tdown" aria-label="Lower temperature">' + icon('minus', 18) + '</button>' +
        '<span class="se-value">' + (p.temp_set === undefined ? 'Keep' : fmtTemp(seTempValue(d, raw))) + '</span>' +
        '<button class="round-btn soft sm" data-act="se-temp" data-i="' + i + '" data-delta="1" data-key="se-' + i + '-tup" aria-label="Raise temperature">' + icon('plus', 18) + '</button></div></div>';
      if ('mode' in d.status) {
        const sp = specOf(d, 'mode');
        const modes = (sp && Array.isArray(sp.range) && sp.range.length) ? sp.range : ['cold', 'hot', 'wind', 'auto'];
        html += seChips(i, 'mode', [['Keep', 'keep']].concat(modes.slice(0, 4).map((m) => [esc(modeLabel(m)), m])), p.mode);
      }
    }
    if (k === 'fan' && on && typeof d.status.fan_speed_percent === 'number') {
      html += p.fan_speed_percent === undefined
        ? '<button class="chip soft se-add" data-act="se-prop" data-i="' + i + '" data-code="fan_speed_percent" data-val="50" data-key="se-' + i + '-addfan">Set fan speed</button>'
        : seRange(i, 'fan_speed_percent', clamp(Number(p.fan_speed_percent), 1, 100), 'Slow', 'Fast', 'Fan speed');
    }
    return html;
  }

  function sceneItemCard(it, i, count) {
    const moves = '<div class="se-tools">' +
      '<button class="edit-btn" data-act="se-move" data-i="' + i + '" data-dir="-1" data-key="se-up-' + i + '" aria-label="Move up"' + (i === 0 ? ' disabled' : '') + '>' + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg></button>' +
      '<button class="edit-btn" data-act="se-move" data-i="' + i + '" data-dir="1" data-key="se-down-' + i + '" aria-label="Move down"' + (i === count - 1 ? ' disabled' : '') + '>' + icon('down', 16) + '</button>' +
      '<button class="edit-btn" data-act="se-remove" data-i="' + i + '" data-key="se-rm-' + i + '" aria-label="Remove this action"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>';
    if (it.type === 'delay') {
      return '<div class="se-item"><div class="se-head"><span class="icon-dot sm">' + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>' + '</span><span class="se-title">Wait</span>' + moves + '</div>' +
        '<div class="se-delay"><label class="field-inline"><span>Minutes</span><input type="number" inputmode="numeric" min="0" max="59" value="' + it.minutes + '" data-act="se-delay" data-i="' + i + '" data-field="minutes" data-key="se-dm-' + i + '"></label>' +
        '<label class="field-inline"><span>Seconds</span><input type="number" inputmode="numeric" min="0" max="59" value="' + it.seconds + '" data-act="se-delay" data-i="' + i + '" data-field="seconds" data-key="se-ds-' + i + '"></label></div></div>';
    }
    if (it.type === 'scene') {
      const sc = S.data.scenes.find((x) => x.id === it.sceneId);
      return '<div class="se-item"><div class="se-head"><span class="icon-dot sm">' + icon('play', 16) + '</span>' +
        '<span class="se-title">Run scene<span class="se-room">' + esc(sc ? sc.name : 'Scene not found') + '</span></span>' + moves + '</div></div>';
    }
    if (it.type === 'raw') {
      const d = it.raw.entity_id ? findDevice(it.raw.entity_id) : null;
      const what = /^ir/.test(it.raw.action_executor) ? 'IR remote action' : /^rule/.test(it.raw.action_executor) ? 'Automation action' : 'Action';
      return '<div class="se-item"><div class="se-head"><span class="icon-dot sm">' + (d ? deviceIcon(d, 18) : icon('generic', 18)) + '</span>' +
        '<span class="se-title">' + esc(d ? d.name : what) + '</span>' + moves + '</div>' +
        '<p class="note se-note">' + what + ' set up in the Tuya app. It\'s kept as is when you save.</p></div>';
    }
    const d = findDevice(it.deviceId);
    if (!d) {
      return '<div class="se-item"><div class="se-head"><span class="icon-dot sm">' + icon('generic', 18) + '</span><span class="se-title">Device not found</span>' + moves + '</div>' +
        '<p class="note se-note">This device isn\'t in the selected home anymore. Remove it to save the scene.</p></div>';
    }
    return '<div class="se-item"><div class="se-head"><span class="icon-dot sm">' + deviceIcon(d, 18) + '</span>' +
      '<span class="se-title">' + esc(d.name) + (d.room ? '<span class="se-room">' + esc(d.room) + '</span>' : '') + '</span>' + moves + '</div>' +
      '<div class="se-controls">' + deviceActionControls(it, i) + '</div></div>';
  }

  function sceneEditorView(routeId, kind) {
    kind = kind || 'scene';
    if (!S.data) return loadingView();
    if (!S.editor || S.editor.routeId !== routeId || S.editor.kind !== kind) {
      if (kind === 'auto') openAutoEditor(routeId); else openEditor(routeId);
    }
    const E = S.editor;
    const auto = kind === 'auto', noun = auto ? 'automation' : 'scene';
    if (E && E.loading) return '<div class="detail-head se-head-top"><div><p class="sub">Automation</p><h1 class="detail-title">Loading…</h1></div></div>';
    if (!E || (routeId !== 'new' && !E.id)) {
      return '<div class="empty"><strong>' + (auto ? 'Automation' : 'Scene') + ' not found</strong><p>' + esc((E && E.error) || 'It may have been deleted in the Tuya app.') + '</p></div>';
    }
    let html = '<div class="detail-head se-head-top"><button class="round-btn" data-act="se-cancel" data-key="se-back" aria-label="Back to scenes">' + icon('back', 20) + '</button>' +
      '<div><p class="sub">' + (auto ? 'Automation' : 'Tap-to-run scene') + '</p><h1 class="detail-title">' + (E.id ? 'Edit ' + noun : 'New ' + noun) + '</h1></div></div>';
    html += '<div class="field"><label for="se-name">' + (auto ? 'Automation name' : 'Scene name') + '</label><input id="se-name" maxlength="40" autocomplete="off" placeholder="' +
      (auto ? 'For example, Hall light when the door opens' : 'For example, Movie night') + '" value="' + esc(E.name) + '" data-act="se-name" data-key="se-name"></div>';
    if (auto) html += conditionsSection(E);
    html += '<h2 class="section-title">' + (auto ? 'Then' : 'Actions') + '</h2>';
    if (!E.items.length && !E.picking) html += '<div class="empty"><strong>No actions yet</strong><p>Add the devices this ' + noun + ' should control.</p></div>';
    html += '<div class="se-list">' + E.items.map((it, i) => sceneItemCard(it, i, E.items.length)).join('') + '</div>';
    if (E.picking) {
      const eligible = S.data.devices.filter(sceneEligible);
      html += '<div class="list se-picker"><div class="list-row"><span class="label">Choose a device</span>' +
        '<button class="chip soft" data-act="se-pick-close" data-key="se-pick-close">Close</button></div>' +
        (eligible.length ? eligible.map((d) => '<button class="list-row" data-act="se-pick" data-id="' + esc(d.id) + '" data-key="se-pick-' + esc(d.id) + '">' +
          '<span class="channel"><span class="icon-dot sm">' + deviceIcon(d, 18) + '</span><span class="label">' + esc(d.name) + '</span></span><span class="value">' + esc(d.room || '') + '</span></button>').join('')
          : '<div class="list-row"><span class="meta">No devices here can be used in scenes yet.</span></div>') +
        (auto && S.data.scenes.length ? '<div class="list-row"><span class="label">Or run a scene</span></div>' + S.data.scenes.map((sc) =>
          '<button class="list-row" data-act="se-pick-scene" data-id="' + esc(sc.id) + '" data-key="se-pscene-' + esc(sc.id) + '"><span class="channel"><span class="icon-dot sm">' + icon('play', 14) + '</span><span class="label">' + esc(sc.name) + '</span></span></button>').join('') : '') +
        '<p class="note se-note">Sensors and cameras can\'t be added as actions.</p></div>';
    } else {
      html += '<div class="se-add-row"><button class="pill-btn" data-act="se-pick-open" data-key="se-pick-open">' + icon('plus', 18) + 'Add device</button>' +
        '<button class="pill-btn soft" data-act="se-add-delay" data-key="se-add-delay">' + icon('plus', 18) + 'Add wait</button></div>';
    }
    if (E.error) html += '<p class="error" role="alert">' + esc(E.error) + '</p>';
    if (E.id) {
      html += '<div class="list" style="margin-top:24px">' +
        '<button class="list-row" data-act="se-dup" data-key="se-dup"' + (E.saving ? ' disabled' : '') + '><span class="label">Duplicate ' + noun + '</span><span class="value">Start a copy</span></button>' +
        '<button class="list-row danger" data-act="se-delete" data-key="se-delete"' + (E.saving ? ' disabled' : '') + '>' +
        '<span class="label">' + (E.confirmDelete ? 'Tap again to delete this ' + noun : 'Delete ' + noun) + '</span></button></div>';
    }
    // Save stays in reach while scrolling a long scene.
    const dirty = editorDirty() || !E.id;
    html += '<div class="se-actions se-sticky">' +
      '<button class="btn" data-act="se-save" data-key="se-save"' + (E.saving ? ' disabled' : '') + '>' + (E.saving ? 'Saving…' : E.id ? 'Save' : 'Create ' + noun) + '</button>' +
      '<span class="se-status" aria-live="polite">' + (E.saving ? '' : E.id && dirty ? 'Unsaved changes' : E.id ? 'No changes' : '') + '</span>' +
      '<button class="btn ghost" data-act="se-cancel" data-key="se-cancel">Cancel</button></div>';
    return html;
  }

  // ---------- Automation editor: conditions ("When") ----------
  const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timeZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } };

  // What a device can trigger on, based on what it reports.
  function triggerOptions(d) {
    const st = d.status, out = [];
    const k = kindOf(d);
    if (k === 'multi') {
      channelCodes(d).forEach((c) => {
        out.push({ label: channelName(d, c) + ' turns on', code: c, op: '==', value: true });
        out.push({ label: channelName(d, c) + ' turns off', code: c, op: '==', value: false });
      });
    } else if (powerCode(d) && k !== 'sensor' && k !== 'camera' && !d.ir) {
      out.push({ label: 'Turns on', code: powerCode(d), op: '==', value: true });
      out.push({ label: 'Turns off', code: powerCode(d), op: '==', value: false });
    }
    if (typeof st.doorcontact_state === 'boolean') {
      out.push({ label: 'Opens', code: 'doorcontact_state', op: '==', value: true });
      out.push({ label: 'Closes', code: 'doorcontact_state', op: '==', value: false });
    }
    if ('pir' in st) out.push({ label: 'Detects motion', code: 'pir', op: '==', value: 'pir' });
    if ('watersensor_state' in st) out.push({ label: 'Detects a leak', code: 'watersensor_state', op: '==', value: 'alarm' });
    if ('smoke_sensor_status' in st) out.push({ label: 'Detects smoke', code: 'smoke_sensor_status', op: '==', value: 'alarm' });
    const tc = ['va_temperature', 'temp_current'].find((c) => typeof st[c] === 'number');
    if (tc && k !== 'climate') {
      out.push({ label: 'Temperature above', code: tc, op: '>', thresh: 'temp' });
      out.push({ label: 'Temperature below', code: tc, op: '<', thresh: 'temp' });
    }
    const hc = ['va_humidity', 'humidity_value'].find((c) => typeof st[c] === 'number');
    if (hc) {
      out.push({ label: 'Humidity above', code: hc, op: '>', thresh: 'hum' });
      out.push({ label: 'Humidity below', code: hc, op: '<', thresh: 'hum' });
    }
    return out;
  }
  function codeScale(d, code, guess) {
    const sp = specOf(d, code);
    if (sp && typeof sp.scale === 'number') return sp.scale;
    return guess && Math.abs(d.status[code]) >= 60 ? 1 : 0;
  }
  function condFromOption(d, opt, keepValue) {
    const c = { type: 'device', deviceId: d.id, code: opt.code, op: opt.op, thresh: opt.thresh || null };
    if (opt.thresh) {
      const scale = codeScale(d, opt.code, opt.thresh === 'temp');
      const shown = keepValue != null ? keepValue : opt.thresh === 'temp' ? 25 : 60;
      c.scale = scale; c.value = Math.round(shown * Math.pow(10, scale));
    } else c.value = opt.value;
    return c;
  }
  function conditionsToItems(conds) {
    return (conds || []).map((c) => {
      const disp = c.display || {};
      // Schedules. Tuya stores a date on repeating ones too, so "once" means: no repeat days.
      if (Number(c.entity_type) === 6 && /^\d{1,2}:\d{2}$/.test(String(disp.time || ''))) {
        const time = String(disp.time).padStart(5, '0'), loops = String(disp.loops || '');
        if (isOnceTimer(disp)) return { type: 'timer', once: true, date: isoDate(disp.date), time, days: [true, true, true, true, true, true, true], tz: disp.timezone_id || timeZone(), disp };
        const l = /^[01]{7}$/.test(loops) && loops !== '0000000' ? loops : '1111111';
        return { type: 'timer', time, days: l.split('').map((x) => x === '1'), tz: disp.timezone_id || timeZone(), disp };
      }
      if (Number(c.entity_type) === 3 && c.entity_id && disp.code) {
        return { type: 'weather', cityId: String(c.entity_id), cityName: c.entity_name || '', disp: Object.assign({}, disp) };
      }
      if (Number(c.entity_type) === 1) {
        const d = findDevice(c.entity_id);
        if (d) {
          const opt = triggerOptions(d).find((o) => o.code === disp.code && o.op === disp.operator && (o.thresh || o.value === disp.value));
          if (opt) {
            const scale = opt.thresh ? codeScale(d, opt.code, opt.thresh === 'temp') : 0;
            return { type: 'device', deviceId: d.id, code: opt.code, op: opt.op, value: disp.value, thresh: opt.thresh || null, scale };
          }
        }
      }
      return { type: 'raw', raw: c };
    });
  }
  function rawConditionLabel(c) {
    const t = Number(c.entity_type);
    if (t === 3) return 'Weather condition from the Tuya app';
    if (t === 6) return 'One-off schedule from the Tuya app';
    if (t === 15) return 'External trigger from the Tuya app';
    const d = findDevice(c.entity_id);
    return (d ? d.name + ': ' : '') + 'condition from the Tuya app';
  }

  function conditionCard(c, i) {
    const tools = '<div class="se-tools"><button class="edit-btn" data-act="ae-cremove" data-i="' + i + '" data-key="ae-rm-' + i + '" aria-label="Remove this condition">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>';
    if (c.type === 'timer') {
      return '<div class="se-item"><div class="se-head"><span class="icon-dot sm">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>' +
        '</span><span class="se-title">' + (c.once ? 'Once, ' + esc(datePhrase(c.date)) + ' at ' + esc(clockPhrase(c.time)) : esc(daysPhrase(c.days.map((x) => (x ? '1' : '0')).join(''))) + ' at ' + esc(clockPhrase(c.time))) +
        '<span class="se-room">' + esc(c.tz) + '</span></span>' + tools + '</div>' +
        '<div class="seg" style="--n:2" role="group" aria-label="Repeat">' +
        '<button class="chip soft" data-act="ae-once" data-v="0" data-i="' + i + '" data-key="ae-rep-' + i + '" aria-pressed="' + !c.once + '">Repeat</button>' +
        '<button class="chip soft" data-act="ae-once" data-v="1" data-i="' + i + '" data-key="ae-once-' + i + '" aria-pressed="' + !!c.once + '">Once</button></div>' +
        (c.once ? '<div class="field-inline"><label for="ae-date-' + i + '">Date</label><input id="ae-date-' + i + '" type="date" value="' + esc(c.date || '') + '" data-act="ae-date" data-i="' + i + '" data-key="ae-date-' + i + '"></div>' : '') +
        '<div class="field-inline"><label for="ae-time-' + i + '">Time</label><input id="ae-time-' + i + '" type="time" value="' + esc(c.time) + '" data-act="ae-time" data-i="' + i + '" data-key="ae-time-' + i + '"></div>' +
        (c.once
          ? (onceIsPast(c.date, c.time) ? '<p class="note se-note">This date has passed, so it won\'t run again. Pick a new date or switch to Repeat.</p>' : '')
          : '<div class="days" role="group" aria-label="Days">' + DAY_LETTERS.map((l, d) =>
            '<button class="day" data-act="ae-day" data-i="' + i + '" data-d="' + d + '" data-key="ae-day-' + i + '-' + d + '" aria-pressed="' + !!c.days[d] + '" aria-label="' + DAY_NAMES[d] + '">' + l + '</button>').join('') + '</div>') +
        '</div>';
    }
    if (c.type === 'weather') {
      const v = c.disp.value, code = c.disp.code;
      let body = '';
      const chips = (act, list, cur) => '<div class="seg" style="--n:' + list.length + '" role="group">' + list.map(([k, label]) =>
        '<button class="chip soft" data-act="' + act + '" data-i="' + i + '" data-v="' + esc(k) + '" data-key="' + act + '-' + i + '-' + esc(k) + '" aria-pressed="' + (cur === k) + '">' + esc(label) + '</button>').join('') + '</div>';
      if (code === 'sunsetrise') body = chips('ae-wx-val', [['sunrise', 'Sunrise'], ['sunset', 'Sunset']], v);
      else if (code === 'temp' && typeof v === 'number') {
        body = chips('ae-wx-op', [['>', 'Above'], ['<', 'Below']], c.disp.operator) +
          '<div class="se-row"><span class="se-label">Outside temperature</span><div class="stepper">' +
          '<button class="round-btn soft sm" data-act="ae-wx-step" data-i="' + i + '" data-d="-1" data-key="ae-wx-m-' + i + '" aria-label="Lower temperature">' + icon('minus', 18) + '</button>' +
          '<span class="se-value">' + v + '°</span>' +
          '<button class="round-btn soft sm" data-act="ae-wx-step" data-i="' + i + '" data-d="1" data-key="ae-wx-p-' + i + '" aria-label="Raise temperature">' + icon('plus', 18) + '</button></div></div>';
      } else if (code === 'condition' && WX_SKY.some(([k]) => k === v)) body = chips('ae-wx-val', WX_SKY, v);
      else if (code === 'humidity' && WX_HUM.some(([k]) => k === v)) body = chips('ae-wx-val', WX_HUM, v);
      else body = '<p class="note se-note">Kept as is when you save.</p>';
      return '<div class="se-item"><div class="se-head"><span class="icon-dot sm">' + icon(weatherIcon(c.disp), 18) + '</span><span class="se-title">' + esc(weatherPhrase(c.disp)) +
        '<span class="se-room">' + esc(cityLabel(c.cityName) || 'Your home\'s city') + '</span></span>' + tools + '</div>' + body + '</div>';
    }
    if (c.type === 'raw') {
      return '<div class="se-item"><div class="se-head"><span class="icon-dot sm">' + icon('generic', 18) + '</span><span class="se-title">' + esc(rawConditionLabel(c.raw)) + '</span>' + tools + '</div>' +
        '<p class="note se-note">Kept as is when you save.</p></div>';
    }
    const d = findDevice(c.deviceId);
    if (!d) return '<div class="se-item"><div class="se-head"><span class="icon-dot sm">' + icon('generic', 18) + '</span><span class="se-title">Device not found</span>' + tools + '</div></div>';
    const opts = triggerOptions(d);
    let html = '<div class="se-item"><div class="se-head"><span class="icon-dot sm">' + deviceIcon(d, 18) + '</span><span class="se-title">' + esc(d.name) +
      (d.room ? '<span class="se-room">' + esc(d.room) + '</span>' : '') + '</span>' + tools + '</div>' +
      '<div class="trigger-chips" role="group" aria-label="When ' + esc(d.name) + '">' + opts.map((o, j) => {
        const on = o.code === c.code && o.op === c.op && (o.thresh ? true : o.value === c.value);
        return '<button class="chip soft" data-act="ae-trigger" data-i="' + i + '" data-j="' + j + '" data-key="ae-tr-' + i + '-' + j + '" aria-pressed="' + on + '">' + esc(o.label) + '</button>';
      }).join('') + '</div>';
    if (c.thresh) {
      const shown = c.value / Math.pow(10, c.scale || 0);
      html += '<div class="se-row"><span class="se-label">' + (c.thresh === 'temp' ? 'Temperature' : 'Humidity') + '</span><div class="stepper">' +
        '<button class="round-btn soft sm" data-act="ae-thresh" data-i="' + i + '" data-delta="-1" data-key="ae-th-d-' + i + '" aria-label="Lower">' + icon('minus', 18) + '</button>' +
        '<span class="se-value">' + (Math.round(shown * 10) / 10) + (c.thresh === 'temp' ? '°' : '%') + '</span>' +
        '<button class="round-btn soft sm" data-act="ae-thresh" data-i="' + i + '" data-delta="1" data-key="ae-th-u-' + i + '" aria-label="Raise">' + icon('plus', 18) + '</button></div></div>';
    }
    return html + '</div>';
  }

  function conditionsSection(E) {
    let html = '<h2 class="section-title">When</h2>';
    if (E.conditions.length > 1) {
      html += '<div class="seg match-seg" style="--n:2" role="group" aria-label="Match">' +
        '<button class="chip soft" data-act="ae-match" data-v="1" data-key="ae-m1" aria-pressed="' + (E.match === 1) + '">Any of these</button>' +
        '<button class="chip soft" data-act="ae-match" data-v="2" data-key="ae-m2" aria-pressed="' + (E.match === 2) + '">All of these</button></div>';
    }
    if (!E.conditions.length && !E.condPicking) html += '<div class="empty"><strong>No conditions yet</strong><p>Choose what starts this automation: a time, or something a device does.</p></div>';
    html += '<div class="se-list">' + E.conditions.map(conditionCard).join('') + '</div>';
    if (E.condPicking) {
      const devs = S.data.devices.filter((d) => triggerOptions(d).length);
      html += '<div class="list se-picker"><div class="list-row"><span class="label">Choose a device</span>' +
        '<button class="chip soft" data-act="ae-pick-close" data-key="ae-pick-close">Close</button></div>' +
        (devs.length ? devs.map((d) => '<button class="list-row" data-act="ae-pick-dev" data-id="' + esc(d.id) + '" data-key="ae-pick-' + esc(d.id) + '">' +
          '<span class="channel"><span class="icon-dot sm">' + deviceIcon(d, 18) + '</span><span class="label">' + esc(d.name) + '</span></span><span class="value">' + esc(d.room || '') + '</span></button>').join('')
          : '<div class="list-row"><span class="meta">No devices here can start automations.</span></div>') + '</div>';
    } else if (E.conditions.length < 10) {
      html += '<div class="se-add-row"><button class="pill-btn" data-act="ae-add-timer" data-key="ae-add-timer">' + icon('plus', 18) + 'Add time</button>' +
        '<button class="pill-btn soft" data-act="ae-pick-open" data-key="ae-pick-open">' + icon('plus', 18) + 'Add device</button>' +
        '<button class="pill-btn soft" data-act="ae-add-sun" data-key="ae-add-sun"' + (E.sunBusy ? ' disabled' : '') + '>' + icon('sunset', 18) + (E.sunBusy ? 'Finding your city…' : 'Sunrise / sunset') + '</button></div>';
    }
    return html;
  }

  function conditionsPayload() {
    const E = S.editor;
    if (!E.conditions.length) return 'Add at least one condition under When.';
    const out = [];
    for (const c of E.conditions) {
      if (c.type === 'timer' && c.once) {
        if (!isoDate(c.date)) return 'Pick a date for each one-time schedule.';
        if (!/^\d{2}:\d{2}$/.test(c.time)) return 'Set a time for each schedule.';
        out.push({ entity_type: 6, entity_id: 'timer', display: Object.assign({}, c.disp || {}, { date: isoDate(c.date).replace(/-/g, ''), time: c.time, loops: '0000000', timezone_id: c.tz || timeZone() }) });
      } else if (c.type === 'timer') {
        if (!c.days.some(Boolean)) return 'Pick at least one day for each time.';
        if (!/^\d{2}:\d{2}$/.test(c.time)) return 'Set a time for each schedule.';
        out.push({ entity_type: 6, entity_id: 'timer', display: Object.assign({}, c.disp || {}, { time: c.time, loops: c.days.map((x) => (x ? '1' : '0')).join(''), timezone_id: c.tz || timeZone() }) });
      } else if (c.type === 'weather') {
        out.push(Object.assign({ entity_type: 3, entity_id: c.cityId, display: Object.assign({}, c.disp) }, c.cityName ? { entity_name: c.cityName } : {}));
      } else if (c.type === 'raw') {
        out.push(c.raw);
      } else {
        if (!findDevice(c.deviceId)) return 'Remove the condition for the device that\'s no longer in this home.';
        out.push({ entity_type: 1, entity_id: c.deviceId, display: { code: c.code, operator: c.op, value: c.value } });
      }
    }
    return out;
  }

  async function openAutoEditor(id) {
    if (!S.data) return;
    const base = { kind: 'auto', routeId: id, id: null, name: '', match: 1, background: '', preconditions: [], conditionRule: '',
      conditions: [], items: [], picking: false, condPicking: false, saving: false, confirmDelete: false, error: '' };
    if (id === 'new') { S.editor = Object.assign(base, { condPicking: false }); S.editor.snap = editorSnap(S.editor); return; }
    S.editor = Object.assign(base, { loading: true });
    try {
      const a = await api('automation-edit?homeId=' + encodeURIComponent(S.data.homeId) + '&id=' + encodeURIComponent(id));
      if (!S.editor || S.editor.routeId !== id) return;
      Object.assign(S.editor, {
        loading: false, id: a.id, name: a.name, match: a.match_type === 2 ? 2 : a.match_type === 3 ? 3 : 1,
        conditionRule: a.condition_rule || '', background: a.background || '', preconditions: a.preconditions || [],
        conditions: conditionsToItems(a.conditions),
        items: stepsToItems((a.actions || []).map((x) => ({ executor: x.action_executor, entity: x.entity_id || '', props: x.executor_property || {} })))
      });
      S.editor.items.forEach((it) => { if (it.type === 'device' && !S.specs[it.deviceId]) loadSpec(it.deviceId, true); });
      S.editor.conditions.forEach((c) => { if (c.type === 'device' && !S.specs[c.deviceId]) loadSpec(c.deviceId, true); });
      S.editor.snap = editorSnap(S.editor);
    } catch (e) {
      if (S.editor && S.editor.routeId === id) Object.assign(S.editor, { loading: false, error: e.message });
    }
    render();
  }

  async function saveAutomation() {
    const E = S.editor;
    const conditions = conditionsPayload();
    if (typeof conditions === 'string') { E.error = conditions; render(); return; }
    const actions = editorActions();
    if (typeof actions === 'string') { E.error = actions; render(); return; }
    E.saving = true; E.error = ''; render();
    try {
      await api('automation-edit', { method: 'POST', body: {
        op: E.id ? 'update' : 'create', homeId: S.data.homeId, automationId: E.id || undefined, irEntities: irEntityIds(),
        name: E.name.trim(), match_type: E.match, condition_rule: E.match === 3 ? E.conditionRule : undefined,
        background: E.background || undefined, preconditions: E.preconditions && E.preconditions.length ? E.preconditions : undefined,
        conditions, actions
      } });
      toast(E.id ? 'Automation saved' : 'Automation created');
      S.editor = null; go('scenes'); refresh({ silent: true, fresh: true });
    } catch (e) {
      E.saving = false; E.error = 'Couldn\'t save: ' + e.message; render();
    }
  }

  async function deleteAutomation() {
    const E = S.editor;
    if (!E.confirmDelete) { E.confirmDelete = true; render(); return; }
    E.saving = true; render();
    try {
      await api('automation-edit', { method: 'POST', body: { op: 'delete', homeId: S.data.homeId, automationId: E.id, name: E.name } });
      toast('Automation deleted');
      S.editor = null; go('scenes'); refresh({ silent: true, fresh: true });
    } catch (e) {
      E.saving = false; E.confirmDelete = false; E.error = 'Couldn\'t delete: ' + e.message; render();
    }
  }

  function irEntityIds() {
    return (S.editor ? S.editor.items : []).filter((it) => it.type === 'device').map((it) => findDevice(it.deviceId)).filter((d) => d && d.ir).map((d) => d.id);
  }

  function editorActions() {
    const E = S.editor;
    const noun = E.kind === 'auto' ? 'automation' : 'scene';
    if (!E.name.trim()) return 'Give the ' + noun + ' a name.';
    if (!E.items.length) return 'Add at least one action.';
    if (E.items[E.items.length - 1].type === 'delay') return 'A ' + noun + ' can\'t end with a wait. Add an action after it, or remove the wait.';
    if (E.items.filter((it) => it.type === 'delay').length > 2) return 'A ' + noun + ' can have at most 2 waits.';
    const out = [];
    for (const it of E.items) {
      if (it.type === 'delay') {
        const total = (it.minutes || 0) * 60 + (it.seconds || 0);
        if (total <= 0) return 'Each wait needs at least 1 second.';
        out.push({ action_executor: 'delay', executor_property: {
          hours: String(Math.floor(total / 3600)), minutes: String(Math.floor((total % 3600) / 60)), seconds: String(total % 60) } });
      } else if (it.type === 'raw') {
        out.push(it.raw);
      } else if (it.type === 'scene') {
        out.push({ action_executor: 'ruleTrigger', entity_id: it.sceneId, executor_property: {} });
      } else {
        const d = findDevice(it.deviceId);
        if (!d) return 'Remove the device that\'s no longer in this home.';
        if (!Object.keys(it.props).length) return 'Choose what ' + d.name + ' should do.';
        out.push({ action_executor: 'dpIssue', entity_id: d.id, executor_property: it.props });
      }
    }
    return out;
  }

  async function saveScene() {
    const E = S.editor;
    if (E.kind === 'auto') return saveAutomation();
    const actions = editorActions();
    if (typeof actions === 'string') { E.error = actions; render(); return; }
    E.saving = true; E.error = ''; render();
    try {
      await api('scene-edit', { method: 'POST', body: {
        op: E.id ? 'update' : 'create', homeId: S.data.homeId, sceneId: E.id || undefined, irEntities: irEntityIds(),
        name: E.name.trim(), background: E.background || undefined, actions
      } });
      toast(E.id ? 'Scene saved' : 'Scene created');
      S.editor = null;
      go('scenes');
      refresh({ silent: true });
    } catch (e) {
      E.saving = false; E.error = 'Couldn\'t save: ' + e.message; render();
    }
  }

  async function deleteScene() {
    const E = S.editor;
    if (E.kind === 'auto') return deleteAutomation();
    if (!E.confirmDelete) { E.confirmDelete = true; render(); return; }
    E.saving = true; render();
    try {
      await api('scene-edit', { method: 'POST', body: { op: 'delete', homeId: S.data.homeId, sceneId: E.id, name: E.name } });
      toast('Scene deleted');
      S.editor = null;
      go('scenes');
      refresh({ silent: true });
    } catch (e) {
      E.saving = false; E.confirmDelete = false; E.error = 'Couldn\'t delete: ' + e.message; render();
    }
  }

  function automationsList() {
    const a = S.data ? S.data.automations : [];
    if (!a.length) return '<div class="empty"><strong>No automations yet</strong><p>' + (canEdit() ? 'Tap New automation to make one, like turning on a light when a door opens. ' : '') + 'Automations from the Tuya app show up here too.</p></div>';
    return '<div class="list">' + a.map((x) =>
      '<div class="list-row auto-row' + (x.enabled ? '' : ' auto-off') + '"><span class="auto-text"><span class="label">' + esc(x.name) + '</span>' +
      (automationPhrase(x) ? '<span class="auto-sum">' + esc(automationPhrase(x)) + '</span>' : '') + '</span><span class="user-actions">' +
      (canEdit() ? '<button class="edit-btn" data-act="auto-open" data-id="' + esc(x.id) + '" data-key="auto-edit-' + esc(x.id) + '" aria-label="Edit ' + esc(x.name) + '">' + icon('pencil', 16) + '</button>' : '') +
      '<button class="switch" role="switch" aria-checked="' + x.enabled + '" aria-label="' + esc(x.name) + '" data-act="auto" data-id="' + esc(x.id) + '" data-key="auto-' + esc(x.id) + '"><span class="knob"></span></button></span></div>'
    ).join('') + '</div>';
  }

  function newAutoButton() {
    return canEdit() ? '<button class="pill-btn" style="margin-left:auto" data-act="auto-new" data-key="auto-new">' + icon('plus', 18) + 'New automation</button>' : '';
  }

  function automationsPanel() {
    const a = S.data ? S.data.automations : [];
    const active = a.filter((x) => x.enabled).length;
    return '<div class="detail"><div class="detail-head"><div><p class="sub">' +
      active + ' of ' + a.length + ' on</p><h2 class="detail-title">Automations</h2></div>' + newAutoButton() + '</div>' + automationsList() + '</div>';
  }

  // ---------- Tab bar that shrinks while scrolling (phones) ----------
  // Scrolling down gives the content more room; any scroll up brings the full tab bar back.
  const tabMin = { last: new WeakMap() };
  document.addEventListener('scroll', (e) => {
    if (window.innerWidth >= 900) return;
    const t = e.target === document ? document.scrollingElement : e.target;
    if (!t || typeof t.scrollTop !== 'number') return;
    const y = t.scrollTop, prev = tabMin.last.has(t) ? tabMin.last.get(t) : y;
    tabMin.last.set(t, y);
    const root = document.documentElement;
    if (y < 40 || y - prev < -6) root.classList.remove('tab-min');
    else if (y - prev > 6) root.classList.add('tab-min');
  }, true);

  // ---------- Wall tablet mode (kiosk) ----------
  // A full-screen dashboard for a tablet on the wall: clock, weather, sensor gauges, scenes and
  // device buttons. Keeps the screen awake, dims itself at night, and needs a press-and-hold to leave.
  const kiosk = { on: false, lock: null, timer: null, wokeUntil: 0, hold: null };
  const KIOSK_NIGHT = [22, 6];   // dim from 22:00 until 06:00
  function kioskStart() {
    kiosk.on = true;
    const el = document.documentElement;
    if (el.requestFullscreen && !document.fullscreenElement) el.requestFullscreen().catch(() => {});
    kioskWake();
    clearInterval(kiosk.timer); kiosk.timer = setInterval(kioskTick, 10000);
    go('kiosk');
  }
  function kioskStop() {
    kiosk.on = false;
    clearInterval(kiosk.timer); kiosk.timer = null;
    if (kiosk.lock) { kiosk.lock.release().catch(() => {}); kiosk.lock = null; }
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    document.documentElement.classList.remove('k-night');
  }
  async function kioskWake() {
    try {
      if ('wakeLock' in navigator && !kiosk.lock && document.visibilityState === 'visible') {
        kiosk.lock = await navigator.wakeLock.request('screen');
        kiosk.lock.addEventListener('release', () => { kiosk.lock = null; });
      }
    } catch (e) { /* not supported or refused: the screen may sleep */ }
  }
  document.addEventListener('visibilitychange', () => { if (kiosk.on && document.visibilityState === 'visible') kioskWake(); });
  function kioskIsNight(now) {
    const h = now.getHours();
    return (h >= KIOSK_NIGHT[0] || h < KIOSK_NIGHT[1]) && Date.now() > kiosk.wokeUntil;
  }
  // "12:27" big with a small "PM" (when the locale uses one).
  function kTime(now) {
    try {
      const parts = new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit' }).formatToParts(now);
      const main = parts.filter((p) => p.type !== 'dayPeriod').map((p) => p.value).join('').trim();
      const ap = parts.find((p) => p.type === 'dayPeriod');
      return esc(main) + (ap ? '<span class="k-ampm">' + esc(ap.value) + '</span>' : '');
    } catch (e) { return esc(now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })); }
  }
  const kDate = (now) => now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
  function kioskTick() {
    if (!kiosk.on) return;
    const now = new Date();
    document.querySelectorAll('[data-kclock="time"]').forEach((n) => { n.innerHTML = kTime(now); });
    document.querySelectorAll('[data-kclock="date"]').forEach((n) => { n.textContent = kDate(now); });
    document.documentElement.classList.toggle('k-night', kioskIsNight(now));
  }
  // A Control Center-style tile: glyph in a circle at the top, name and state at the bottom.
  // Off it's glass; on it turns bright, like accessories in the Home app.
  function kioskTile(d) {
    const on = isOn(d) && d.online, busy = isPending(d.id);
    return '<button class="k-w s k-ctl' + (on ? ' on' : '') + (busy ? ' pending' : '') + '" data-act="toggle" data-id="' + esc(d.id) + '" data-key="k-' + esc(d.id) + '"' +
      ' aria-pressed="' + isOn(d) + '" aria-label="' + esc(d.name + ', ' + (d.online ? statusText(d) : 'Offline')) + '"' + (d.online ? '' : ' disabled') + '>' +
      '<span class="k-glyph">' + deviceIcon(d, 24) + '</span>' +
      '<span class="k-ctl-text"><span class="k-name">' + esc(d.name) + '</span><span class="k-status">' + esc(d.online ? statusText(d) : 'Offline') + '</span></span></button>';
  }
  // A small widget per sensor: its name, then temperature and humidity gauges.
  function kioskSensor(d) {
    const r = readingsOf(d);
    let g = '';
    if (!d.online) g = '<span class="k-status">Offline</span>';
    else {
      if (r.temp != null) g += gauge('temp', 'Temperature', fmtReading(r.temp), (r.temp - GAUGE_TEMP[0]) / (GAUGE_TEMP[1] - GAUGE_TEMP[0]));
      if (r.hum != null) g += gauge('hum', 'Humidity', Math.round(r.hum) + '%', r.hum / 100);
    }
    const low = typeof d.status.battery_percentage === 'number' && d.status.battery_percentage <= 20;
    return '<button class="k-w s k-sensor" data-act="open-history" data-id="' + esc(d.id) + '" data-key="ksn-' + esc(d.id) + '" aria-label="' + esc(d.name + ', show history') + '">' +
      '<span class="k-wname">' + esc(d.name) + (low ? '<span class="k-low"> · Battery low</span>' : '') + '</span><span class="k-gauges">' + g + '</span></button>';
  }
  // Air conditioners and thermostats get their own card: power, target temperature, mode (and fan for IR).
  const isKioskAc = (d) => kindOf(d) === 'irac' || (kindOf(d) === 'climate' && 'temp_set' in d.status);
  // Like the Home app's thermostat: "Current · Humidity" under the name, a large arc you drag to set
  // the temperature (coloured for the mode), "SET TO" in the middle, and a mode menu with a check.
  const KARC = { cx: 150, cy: 150, r: 118, from: 135, sweep: 270 };
  function kaPoint(a) { const t = a * Math.PI / 180; return [KARC.cx + KARC.r * Math.cos(t), KARC.cy + KARC.r * Math.sin(t)]; }
  function kaPath(a0, a1) {
    const [x0, y0] = kaPoint(a0), [x1, y1] = kaPoint(a1);
    return 'M' + x0.toFixed(1) + ' ' + y0.toFixed(1) + ' A' + KARC.r + ' ' + KARC.r + ' 0 ' + (a1 - a0 > 180 ? 1 : 0) + ' 1 ' + x1.toFixed(1) + ' ' + y1.toFixed(1);
  }
  const kaAngle = (v, min, max) => KARC.from + KARC.sweep * Math.min(1, Math.max(0, (v - min) / (max - min)));
  // Colour of the filled arc for each mode (cool blue, heat orange, auto both, fan/dry teal).
  function acTheme(d) {
    if (!isOn(d)) return 'off';
    const m = kindOf(d) === 'irac' ? ['cool', 'heat', 'auto', 'fan', 'dry'][(d.ir.state || {}).mode || 0] : String(d.status.mode || '');
    if (/hot|heat/.test(m)) return 'heat';
    if (/auto/.test(m)) return 'auto';
    if (/wind|fan|wet|dry/.test(m)) return 'fan';
    return 'cool';
  }
  // The thermostat (arc dial, mode symbols, fan for IR ACs): used by wall tablet mode and every AC screen.
  function acThermo(d, sfx) {
    const id = esc(d.id), ir = kindOf(d) === 'irac', on = isOn(d), dis = d.online ? '' : ' disabled';
    let set, room = null, hum = null, unit = '°C', min = 16, max = 30, step = 1, rows = [], fan = '';
    if (ir) {
      const st2 = d.ir.state || { power: false, mode: 0, temp: 24, wind: 0 };
      set = st2.temp;
      const hub = d.ir.hub ? findDevice(d.ir.hub) : null;
      room = hub ? (scaled(hub, 'va_temperature', true) ?? scaled(hub, 'temp_current', true)) : null;
      hum = hub ? scaled(hub, 'va_humidity', false) : null;
      rows = IR_MODES.map((m, i) => ({ label: m, act: 'data-act="irmode" data-v="' + i + '"', on: !!st2.power && st2.mode === i, key: i }));
      fan = irFanControl(d, st2, sfx);
    } else {
      const sp = specOf(d, 'temp_set');
      const sc = sp && typeof sp.scale === 'number' ? sp.scale : (Math.abs(d.status.temp_set) >= 60 ? 1 : 0);
      const div = Math.pow(10, sc);
      set = scaled(d, 'temp_set', true);
      min = sp && typeof sp.min === 'number' ? sp.min / div : 16;
      max = sp && typeof sp.max === 'number' ? sp.max / div : 30;
      step = sp && sp.step ? sp.step / div : 1;
      unit = tempUnitOf(sp);
      room = scaled(d, 'temp_current', true);
      hum = scaled(d, 'humidity_current', false);
      if ('mode' in d.status) {
        const msp = specOf(d, 'mode');
        const list = (msp && Array.isArray(msp.range) && msp.range.length) ? msp.range : ['cold', 'hot', 'auto', 'wind'];
        rows = list.map((m) => ({ label: modeLabel(m), act: 'data-act="mode" data-val="' + esc(m) + '"', on: on && d.status.mode === m, key: esc(m) }));
      }
    }
    if (set == null) set = min;
    const theme = acTheme(d), a = kaAngle(set, min, max), [tx, ty] = kaPoint(a);
    let curDot = '';
    if (room != null && room >= min && room <= max) {
      const [cx, cy] = kaPoint(kaAngle(room, min, max));
      curDot = '<circle class="ka-cur" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="5"/>';
    }
    const sub = [room != null ? 'Current ' + fmtReading(room) : null, hum != null ? 'Humidity ' + Math.round(hum) + '%' : null].filter(Boolean).join(' · ');
    const kaIcon = (l) => ({ Cool: 'flake', Heat: 'sun', Auto: 'automode', Fan: 'fan', Dry: 'drop' })[l] || 'climate';
    const kaBtn = (act, key, pressed, label, ic, cls) => '<button class="ka-mi ' + cls + '" ' + act + ' data-id="' + id + '" data-key="kam-' + id + sfx + '-' + key + '" aria-pressed="' + pressed + '" aria-label="' + esc(label) + '" title="' + esc(label) + '"' + dis + '>' + icon(ic, 22) + '</button>';
    const menu = '<div class="ka-menu ka-icons" role="group" aria-label="Mode" data-key="kamenu-' + id + sfx + '">' +
      kaBtn('data-act="ac-off"', 'off', !on, 'Off', 'power', 'ka-mi-off') +
      rows.map((r) => kaBtn(r.act, r.key, r.on, r.label, kaIcon(r.label), 'ka-mi-' + kaIcon(r.label))).join('') + '</div>' +
      '<div class="ka-mode-name">' + esc(on ? ((rows.find((r) => r.on) || {}).label || 'On') : 'Off') + '</div>';
    const body = '<div class="ka-body"><div class="ka-dial" role="slider" tabindex="0" aria-label="' + esc(d.name) + ' temperature"' +
      ' aria-valuemin="' + min + '" aria-valuemax="' + max + '" aria-valuenow="' + set + '" aria-valuetext="' + esc(tdFmt(set) + unit) + '"' +
      ' data-id="' + id + '" data-act-temp="' + (ir ? 'irtemp' : 'temp') + '" data-min="' + min + '" data-max="' + max + '" data-step="' + step + '" data-value="' + set + '" data-unit="' + esc(unit) + '" data-key="ka-' + id + sfx + '"' + (d.online ? '' : ' aria-disabled="true"') + '>' +
      '<svg viewBox="0 0 300 300" aria-hidden="true"><defs>' +
      '<linearGradient id="kag-' + id + sfx + '" x1="0" y1="1" x2="0.4" y2="0"><stop offset="0" class="ka-g0"/><stop offset="1" class="ka-g1"/></linearGradient></defs>' +
      '<path class="ka-track" d="' + kaPath(KARC.from, KARC.from + KARC.sweep) + '"/>' +
      '<path class="ka-fill" stroke="url(#kag-' + id + sfx + ')" d="' + kaPath(KARC.from, Math.max(KARC.from + 0.5, a)) + '"/>' + curDot +
      '<circle class="ka-thumb" cx="' + tx.toFixed(1) + '" cy="' + ty.toFixed(1) + '" r="17"/></svg>' +
      '<span class="ka-center"><span class="ka-label">' + (on ? 'Set to' : 'Off') + '</span><span class="ka-num">' + tdFmt(set) + '</span></span></div>' +
      '<div class="ka-side">' + menu + (fan ? '<div class="k-ac-fan">' + fan + '</div>' : '') + '</div></div>';
    return { theme, on: on && d.online, fan: !!fan, sub, body };
  }
  function kioskAcCard(d) {
    const t = acThermo(d, '-k');
    return '<section class="k-w l k-ac ka ka-' + t.theme + (t.fan ? ' has-fan' : '') + (t.on ? ' on' : '') + '" aria-label="' + esc(d.name) + '">' +
      '<div class="ka-head"><span class="k-name">' + esc(d.name) + '</span>' + (t.sub ? '<span class="ka-sub">' + esc(t.sub) + '</span>' : '') + '</div>' +
      t.body + '</section>';
  }
  // On the AC's own screen: the same thermostat, laid out in a column.
  function acPage(d, sfx) {
    const t = acThermo(d, sfx);
    return '<div class="ka-page"><div class="ka ka-' + t.theme + (t.fan ? ' has-fan' : '') + (t.on ? ' on' : '') + '">' +
      (t.sub ? '<div class="ka-sub">' + esc(t.sub) + '</div>' : '') + t.body + '</div></div>';
  }
  // Dragging around the arc. The dial updates live; the AC is told when you let go.
  let kaDrag = null;
  function kaValueAt(el, e) {
    const box = el.querySelector('svg').getBoundingClientRect();
    const x = (e.clientX - box.left) / box.width * 300 - KARC.cx, y = (e.clientY - box.top) / box.height * 300 - KARC.cy;
    let ang = Math.atan2(y, x) * 180 / Math.PI;          // -180..180, 0 = right, 90 = down
    let rel = ((ang - KARC.from) % 360 + 360) % 360;       // 0..360 from the start of the arc
    if (rel > KARC.sweep) rel = rel - KARC.sweep < (360 - KARC.sweep) / 2 ? KARC.sweep : 0;   // in the gap: nearest end
    const m = tdModel(el);
    return tdSnap(m, m.min + (m.max - m.min) * rel / KARC.sweep);
  }
  function kaShow(el, v) {
    const m = tdModel(el), a = kaAngle(v, m.min, m.max), [x, y] = kaPoint(a);
    el.querySelector('.ka-fill').setAttribute('d', kaPath(KARC.from, Math.max(KARC.from + 0.5, a)));
    const th = el.querySelector('.ka-thumb'); th.setAttribute('cx', x.toFixed(1)); th.setAttribute('cy', y.toFixed(1));
    el.querySelector('.ka-num').textContent = tdFmt(v);
    el.setAttribute('aria-valuenow', v); el.setAttribute('aria-valuetext', tdFmt(v) + m.unit);
  }
  document.addEventListener('pointerdown', (e) => {
    const el = e.target.closest && e.target.closest('.ka-dial');
    if (!el || el.getAttribute('aria-disabled') === 'true') return;
    e.preventDefault();
    el.focus({ preventScroll: true });
    S.dragging = true;
    kaDrag = { el, v: kaValueAt(el, e) };
    el.classList.add('dragging');
    kaShow(el, kaDrag.v);
    if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
  });
  document.addEventListener('pointermove', (e) => {
    if (!kaDrag) return;
    const v = kaValueAt(kaDrag.el, e);
    if (v !== kaDrag.v) { kaDrag.v = v; kaShow(kaDrag.el, v); }
  });
  const kaEnd = (e) => {
    if (!kaDrag) return;
    const { el, v } = kaDrag; kaDrag = null; S.dragging = false;
    el.classList.remove('dragging');
    if (e.type === 'pointercancel') { render(); return; }
    el.dataset.value = v;
    tdCommit(el, v);
  };
  document.addEventListener('pointerup', kaEnd);
  document.addEventListener('pointercancel', kaEnd);
  document.addEventListener('keydown', (e) => {
    const el = e.target.closest && e.target.closest('.ka-dial');
    if (!el || el.getAttribute('aria-disabled') === 'true') return;
    const dir = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    const m = tdModel(el), v = tdSnap(m, Number(el.dataset.value) + dir * m.step);
    el.dataset.value = v; kaShow(el, v);
    clearTimeout(el._t); el._t = setTimeout(() => tdCommit(el, v), 400);
  });

  function kioskView() {
    const data = S.data;
    if (!data) return '<div class="kiosk-wrap k26"><div class="k-lock"><div class="k-time">…</div></div></div>';
    if (!kiosk.on) { kiosk.on = true; kioskWake(); clearInterval(kiosk.timer); kiosk.timer = setInterval(kioskTick, 10000); }
    loadWeather();
    const now = new Date();
    document.documentElement.classList.toggle('k-night', kioskIsNight(now));
    // Rooms: a compact row of pills. Only rooms with something to show here are listed.
    const kShows = (d) => isReadingDevice(d) || isKioskAc(d) || (hasToggle(d) && !d.ir);
    const kAll = data.devices.filter(kShows);
    const kRooms = (data.rooms || []).filter((r) => kAll.some((d) => d.room === r));
    const kRoomList = kRooms.length ? ['All'].concat(kRooms, kAll.some((d) => !d.room) ? ['Other'] : []) : [];
    if (!kRoomList.includes(S.kRoom)) S.kRoom = 'All';
    const inRoom = (d) => S.kRoom === 'All' || (S.kRoom === 'Other' ? !d.room : d.room === S.kRoom);
    const readings = data.devices.filter((d) => isReadingDevice(d) && inRoom(d));
    const acs = sortByOrder(data.devices.filter((d) => isKioskAc(d) && inRoom(d)), data.homeId);
    const devices = sortByOrder(data.devices.filter((d) => !isReadingDevice(d) && !isKioskAc(d) && hasToggle(d) && !d.ir && inRoom(d)), data.homeId).slice(0, 12);
    const scenes = data.scenes || [];
    const w = S.weather;
    const wx = w && w.available && w.homeId === data.homeId && w.unit === S.tempUnit
      ? (() => { const [ic, desc] = weatherInfo(w.code, w.isDay); return '<span class="k-wx" aria-label="' + esc(desc + ', ' + w.temp + w.unitLabel) + '">' + icon(ic, 20) + '<span>' + w.temp + '°</span></span>'; })()
      : '';
    // Like the Lock Screen: date (with the weather) above a large clock.
    let html = '<div class="kiosk-wrap k26">' +
      '<header class="k-lock"><div class="k-dateline"><span data-kclock="date">' + kDate(now) + '</span>' + wx + '</div>' +
      '<div class="k-time" data-kclock="time">' + kTime(now) + '</div>' +
      '<button class="k-exit" data-key="k-exit" aria-label="Leave wall tablet mode (press and hold)" title="Press and hold to leave">' +
      '<svg class="k-exit-ring" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="20"/></svg>' + icon('close', 18) + '</button></header>';
    // Temperature and humidity as Home app summaries.
    if (readings.length) html += '<div class="k-climate">' + climateSummaries(readings, true) + '</div>';
    // Scenes as a row of capsules, like the Home app.
    if (scenes.length) {
      html += '<div class="k-scenes26" role="group" aria-label="Scenes">' + scenes.map((sc) => {
        const st = S.sceneState[sc.id];
        return '<button class="k-cap ' + (st || '') + '" data-act="scene" data-id="' + esc(sc.id) + '" data-key="ks-' + esc(sc.id) + '"' + (st === 'running' ? ' disabled' : '') + '>' +
          '<span class="k-cap-dot">' + icon(st === 'done' ? 'check' : 'play', 16) + '</span><span class="k-cap-name">' + esc(sc.name) + '</span></button>';
      }).join('') + '</div>';
    }
    if (kRoomList.length > 2) {
      html += '<div class="k-rooms" role="group" aria-label="Rooms">' + kRoomList.map((r) =>
        '<button class="k-room" data-act="kroom" data-room="' + esc(r) + '" data-key="kr-' + esc(r) + '" aria-pressed="' + (r === S.kRoom) + '">' + esc(r === 'All' ? 'All rooms' : r) + '</button>').join('') + '</div>';
    }
    // Widgets: sensors (small), air conditioners (large) and device controls (small), packed tightly.
    html += '<div class="k-grid" role="group" aria-label="' + esc(S.kRoom === 'All' ? 'Home' : S.kRoom) + '">' +
      acs.map(kioskAcCard).join('') + devices.map(kioskTile).join('') + '</div>' +
      (acs.length || devices.length ? '' : '<p class="k-empty">Nothing to control in ' + esc(S.kRoom) + '.</p>');
    html += '<button class="k-dim" data-act="kiosk-wake" data-key="k-dim" aria-label="Wake the screen" tabindex="-1"></button></div>';
    return html;
  }
  // Leaving needs a 1-second press, so a passing hand (or a child) doesn't exit by accident.
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest && e.target.closest('.k-exit');
    if (!b) return;
    e.preventDefault();
    b.classList.add('holding');
    kiosk.hold = setTimeout(() => { kiosk.hold = null; kioskStop(); go('me'); }, 1000);
  });
  const kioskHoldEnd = (e) => {
    if (!kiosk.hold) return;
    clearTimeout(kiosk.hold); kiosk.hold = null;
    document.querySelectorAll('.k-exit.holding').forEach((b) => b.classList.remove('holding'));
    if (e.type === 'pointerup') toast('Press and hold to leave wall tablet mode.');
  };
  document.addEventListener('pointerup', kioskHoldEnd);
  document.addEventListener('pointercancel', kioskHoldEnd);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && kiosk.on && route().view === 'kiosk') { kioskStop(); go('me'); } });

  // ---------- Me ----------
  // The main page keeps only what people reach for; everything else lives one tap away.
  const chevRow = (act, tab, key, label, value) =>
    '<button class="list-row" data-act="' + act + '"' + (tab ? ' data-tab="' + tab + '"' : '') + ' data-key="' + key + '"><span class="label">' + label + '</span>' +
    '<span class="value icon-value">' + (value ? esc(value) : '') + icon('chevron', 16) + '</span></button>';
  const subHead = (sub, title, back, key) =>
    '<div class="detail-head se-head-top"><button class="round-btn" data-act="tab" data-tab="' + (back || 'me') + '" data-key="' + key + '" aria-label="Back">' + icon('back', 20) + '</button>' +
    '<div><p class="sub">' + sub + '</p><h1 class="detail-title">' + title + '</h1></div></div>';
  const noteBelow = (t) => '<p class="note" style="text-align:left;margin-top:10px">' + t + '</p>';
  const isAdminView = () => S.mode === 'demo' || (S.mode === 'live' && (!S.me || S.me.role === 'admin'));
  const pollLabel = () => ({ 2000: 'Every 2 s', 4000: 'Every 4 s', 10000: 'Every 10 s', 30000: 'Every 30 s' })[S.pollMs] || 'Every ' + Math.round(S.pollMs / 1000) + ' s';

  function meView() {
    const data = S.data;
    const live = S.mode === 'live';
    const name = S.me ? S.me.name : (live ? 'Owner' : 'Sample home');
    const role = S.me ? (S.me.owner ? 'Owner' : S.me.role === 'admin' ? 'Admin' : 'Member') : (live ? 'Connected' : 'Demo');
    const sub = live ? (S.sync ? 'Synced across your devices' : 'This device only') : 'Sample devices';
    let html = '<div class="head"><div><h1 class="title">Me</h1></div></div>';

    html += '<div class="list me-card"><div class="list-row"><span class="me-avatar" aria-hidden="true">' + esc(name.trim().charAt(0).toUpperCase() || 'H') + '</span>' +
      '<span class="me-who"><span class="label">' + esc(name) + '</span><span class="me-sub">' + esc((role === name ? '' : role + ' · ') + sub) + '</span></span>' +
      (!live ? '<button class="chip" data-act="live" data-key="live">Connect</button>' : '') + '</div></div>';

    html += '<div class="list">';
    if (data && data.homes && data.homes.length > 1) {
      html += '<div class="list-row"><label class="label" for="home-select">Home</label><select id="home-select" data-act="home" data-key="home-select">' +
        data.homes.map((h) => '<option value="' + esc(h.id) + '"' + (h.id === data.homeId ? ' selected' : '') + '>' + esc(h.name) + '</option>').join('') + '</select></div>';
    }
    if (S.mode === 'demo' || S.sync) html += chevRow('tab', 'activity', 'activity-open', 'Activity', 'Who did what');
    if (isAdminView()) {
      const n = Array.isArray(S.users) ? S.users.length + 1 : null;
      html += chevRow('tab', 'people', 'people-open', 'People', n ? n + (n === 1 ? ' person' : ' people') : '');
    }
    html += chevRow('tab', 'icons', 'icons-open', 'Device icons', '');
    html += chevRow('kiosk-enter', null, 'kiosk-open', 'Wall tablet mode', 'Clock, scenes, devices');
    html += '</div>';

    html += '<div class="list">' +
      chevRow('tab', 'appearance', 'appearance-open', 'Appearance', (BACKGROUNDS.find(([v]) => v === S.bg) || BACKGROUNDS[0])[1]) +
      chevRow('tab', 'settings', 'settings-open', 'Settings', live && readVault() ? 'PIN on' : pollLabel());
    if (data && data.warnings && data.warnings.length) {
      html += '<button class="list-row" data-act="tab" data-tab="attention" data-key="attention-open"><span class="label attn">Needs attention</span>' +
        '<span class="value icon-value"><span class="count-badge">' + data.warnings.length + '</span>' + icon('chevron', 16) + '</span></button>';
    }
    html += chevRow('tab', 'about', 'about-open', 'About', 'Version ' + APP_VERSION) + '</div>';

    if (live) html += '<div class="list"><button class="list-row danger" data-act="signout" data-key="signout"><span class="label">Sign out</span><span class="value">On this device</span></button></div>';
    if (isAdminView() && S.sync && S.users === null) loadUsers();
    return html;
  }

  function peopleView() {
    let html = subHead('Me', 'People', 'me', 'people-back');
    html += usersSection().replace('<h2 class="section-title">People</h2>', '');
    html += noteBelow('Members control devices, run scenes and switch automations. Admins can also edit scenes and automations and manage people. Everyone signs in with their own password.');
    return html;
  }

  function appearanceView() {
    let html = subHead('Me', 'Appearance', 'me', 'appearance-back');
    html += '<div class="list">' +
      chevRow('tab', 'backgrounds', 'bg-open', 'Background', (BACKGROUNDS.find(([v]) => v === S.bg) || BACKGROUNDS[0])[1]) +
      '<div class="list-row"><label class="label" for="unit-select">Weather units</label><select id="unit-select" data-act="tempunit" data-key="unit-select">' +
      '<option value="c"' + (S.tempUnit === 'c' ? ' selected' : '') + '>Celsius (°C)</option>' +
      '<option value="f"' + (S.tempUnit === 'f' ? ' selected' : '') + '>Fahrenheit (°F)</option></select></div>' +
      '<div class="list-row"><span class="label" id="dist-label">Distance from home</span>' +
      '<button class="switch" role="switch" aria-checked="' + S.showDistance + '" aria-labelledby="dist-label" data-act="distance" data-key="distance"><span class="knob"></span></button></div></div>';
    html += noteBelow('Distance from home shows how far you are under the greeting. Your location stays on this phone.');
    return html;
  }

  function settingsView() {
    const data = S.data, live = S.mode === 'live';
    const updated = data && data.at ? new Date(data.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
    let html = subHead('Me', 'Settings', 'me', 'settings-back');
    html += '<h2 class="section-title">Updates</h2><div class="list">' +
      '<div class="list-row"><label class="label" for="poll-select">Live updates</label><select id="poll-select" data-act="poll" data-key="poll-select">' +
      [[2000, 'Fastest (2 s)'], [4000, 'Fast (4 s)'], [10000, 'Normal (10 s)'], [30000, 'Saver (30 s)']].map(([ms, label]) =>
        '<option value="' + ms + '"' + (S.pollMs === ms ? ' selected' : '') + '>' + label + '</option>').join('') + '</select></div>' +
      '<button class="list-row" data-act="refresh" data-key="refresh"><span class="label">Refresh now</span><span class="value">' + (updated ? 'Updated ' + updated : '') + '</span></button>' +
      (S.loadMs && live ? '<div class="list-row"><span class="label">Last full update took</span><span class="value">' + (S.loadMs / 1000).toFixed(1) + ' s</span></div>' : '') + '</div>';
    html += noteBelow('Tuya\'s free plan has a monthly allowance of API calls. To save them, Home checks less often when it\'s left idle (every 30 s) and in wall tablet mode (every 15 s, every minute at night), and catches up as soon as you touch it.');
    if (live) {
      const hasPin = !!readVault();
      html += '<h2 class="section-title">Security</h2><div class="list">';
      if (pinSupported) {
        html += hasPin
          ? '<button class="list-row" data-act="pin-setup" data-key="pin-change"><span class="label">Change PIN</span>' + icon('chevron', 16) + '</button>' +
            '<button class="list-row" data-act="pin-off" data-key="pin-off"><span class="label">Turn off PIN</span><span class="value">Opens without unlocking</span></button>'
          : '<button class="list-row" data-act="pin-setup" data-key="pin-setup"><span class="label">Unlock with a PIN</span><span class="value">Off</span></button>';
      }
      if (S.me && !S.me.owner && S.sync) html += pwFormView();
      html += '<button class="list-row" data-act="lock" data-key="lock"><span class="label">Lock app</span><span class="value">' +
        (hasPin ? 'Asks for your PIN' : 'Asks for the password again') + '</span></button></div>';
      if (hasPin) html += noteBelow('Home also locks itself after 5 minutes in the background. After ' + PIN_TRIES + ' wrong PINs it asks for your password instead.');
    }
    if (live || S.mode === 'demo') {
      html += '<h2 class="section-title">This app</h2><div class="list"><div class="list-row"><span class="label">Sync icons across devices</span><span class="value">' + (S.sync ? 'On' : 'Off') + '</span></div>' +
        (S.installPrompt ? '<button class="list-row" data-act="install" data-key="install"><span class="label">Install app</span>' + icon('chevron', 16) + '</button>' : '') +
        (!live ? '<button class="list-row" data-act="live" data-key="live2"><span class="label">Connect my server</span>' + icon('chevron', 16) + '</button>' : '') + '</div>';
      if (!S.sync) html += noteBelow('Connect a free Neon database in Vercel to sync icons and add people. See "Sync and users" in the README.');
    }
    return html;
  }

  function aboutView() {
    let html = subHead('Me', 'About', 'me', 'about-back');
    html += '<div class="list">' +
      chevRow('tab', 'changelog', 'changelog-open', 'Version', APP_VERSION + ', what\'s new') +
      '<div class="list-row"><span class="label">Adding devices</span><span class="value">Pair them in the Tuya app</span></div></div>';
    return html;
  }

  function attentionView() {
    const w = (S.data && S.data.warnings) || [];
    let html = subHead('Me', 'Needs attention', 'me', 'attention-back');
    if (!w.length) return html + '<div class="empty"><strong>All good</strong><p>Nothing needs your attention right now.</p></div>';
    html += '<div class="list">' + w.map((x) => '<div class="list-row"><span class="meta">' + esc(x) + '</span></div>').join('') + '</div>';
    html += noteBelow('A permission error usually means a service is not yet authorized in your Tuya cloud project. The README explains how to add it.');
    return html;
  }

  function usersSection() {
    let html = '<h2 class="section-title">People</h2>';
    if (!S.sync) {
      return html + '<div class="list"><div class="list-row"><span class="label">Owner</span><span class="value">Uses APP_PASSWORD</span></div></div>' +
        '<p class="note" style="text-align:left;margin-top:10px">To give others their own password, set up storage first (README, "Sync and users").</p>';
    }
    if (S.users === null) { loadUsers(); return html + '<p class="note" style="text-align:left">Loading…</p>'; }
    if (S.users === 'loading') return html + '<p class="note" style="text-align:left">Loading…</p>';
    if (S.users && S.users.error) return html + '<p class="note" style="text-align:left">' + esc(S.users.error) + '</p>';
    html += '<div class="list"><div class="list-row"><span class="channel"><span class="label">Owner</span></span><span class="value">Admin</span></div>';
    html += S.users.map((u) => {
      const armed = S.userDelete === u.id;
      const homes = (S.data && S.data.homes) || [];
      const isAdmin = u.role === 'admin';
      const sel = Array.isArray(u.homes) ? u.homes : null;
      const homeOptions = isAdmin
        ? '<option selected>All homes</option>'
        : '<option value=""' + (!sel ? ' selected' : '') + '>All homes</option>' +
          (sel && sel.length > 1 ? '<option selected disabled>' + sel.length + ' homes</option>' : '') +
          (sel && sel.length === 0 ? '<option value="none" selected>No homes</option>' : '') +
          homes.map((h) => '<option value="' + esc(h.id) + '"' + (sel && sel.length === 1 && sel[0] === h.id ? ' selected' : '') + '>Only ' + esc(h.name) + '</option>').join('');
      return '<div class="list-row user-row"><div class="user-top"><span class="label">' + esc(u.name) + '</span>' +
        '<button class="user-remove' + (armed ? ' armed' : '') + '" data-act="user-del" data-id="' + esc(u.id) + '" data-key="udel-' + esc(u.id) + '" aria-label="' + (armed ? 'Confirm removing ' : 'Remove ') + esc(u.name) + '">' + (armed ? 'Confirm' : 'Remove') + '</button></div>' +
        '<div class="user-controls">' +
        '<label class="sr-only" for="role-' + esc(u.id) + '">Role for ' + esc(u.name) + '</label>' +
        '<select id="role-' + esc(u.id) + '" data-act="user-role" data-id="' + esc(u.id) + '" data-key="role-' + esc(u.id) + '">' +
        ['member', 'admin'].map((r) => '<option value="' + r + '"' + (u.role === r ? ' selected' : '') + '>' + (r === 'admin' ? 'Admin' : 'Member') + '</option>').join('') + '</select>' +
        '<label class="sr-only" for="uhome-' + esc(u.id) + '">Homes for ' + esc(u.name) + '</label>' +
        '<select id="uhome-' + esc(u.id) + '" data-act="user-homes" data-id="' + esc(u.id) + '" data-key="uhome-' + esc(u.id) + '"' + (isAdmin ? ' disabled' : '') + '>' + homeOptions + '</select>' +
        '</div></div>';
    }).join('');
    const F = S.userForm;
    if (F.open) {
      html += '<form class="user-form" data-act="user-add" novalidate>' +
        '<div class="field"><label for="uf-name">Name</label><input id="uf-name" maxlength="30" autocomplete="off" value="' + esc(F.name) + '" data-act="uf" data-field="name" data-key="uf-name"></div>' +
        '<div class="field"><label for="uf-pw">Password (at least 8 characters)</label><input id="uf-pw" type="password" autocomplete="new-password" value="' + esc(F.password) + '" data-act="uf" data-field="password" data-key="uf-pw"></div>' +
        '<div class="field"><label for="uf-role">Role</label><select id="uf-role" data-act="uf" data-field="role" data-key="uf-role">' +
        '<option value="member"' + (F.role === 'member' ? ' selected' : '') + '>Member: control devices and run scenes</option>' +
        '<option value="admin"' + (F.role === 'admin' ? ' selected' : '') + '>Admin: also edit scenes and manage people</option></select></div>' +
        (F.role === 'member' && S.data && S.data.homes && S.data.homes.length > 1
          ? '<div class="field"><label for="uf-home">Homes</label><select id="uf-home" data-act="uf" data-field="home" data-key="uf-home">' +
            '<option value=""' + (!F.home ? ' selected' : '') + '>All homes</option>' +
            S.data.homes.map((h) => '<option value="' + esc(h.id) + '"' + (F.home === h.id ? ' selected' : '') + '>Only ' + esc(h.name) + '</option>').join('') + '</select></div>'
          : '') +
        (F.error ? '<p class="error" role="alert">' + esc(F.error) + '</p>' : '') +
        '<div class="pin-actions"><button type="button" class="btn ghost" data-act="user-form-close" data-key="uf-cancel">Cancel</button>' +
        '<button type="submit" class="btn" data-key="uf-save"' + (F.busy ? ' disabled' : '') + '>' + (F.busy ? 'Adding…' : 'Add person') + '</button></div></form>';
    } else {
      html += '<button class="list-row" data-act="user-form-open" data-key="uf-open"><span class="label">Add a person</span>' + icon('plus', 16) + '</button>';
    }
    html += '</div>';
    return html;
  }

  function pwFormView() {
    const F = S.pwForm;
    if (!F.open) return '<button class="list-row" data-act="pw-open" data-key="pw-open"><span class="label">Change my password</span>' + icon('chevron', 16) + '</button>';
    return '<form class="user-form" data-act="pw-save" novalidate>' +
      '<div class="field"><label for="pf-cur">Current password</label><input id="pf-cur" type="password" autocomplete="current-password" value="' + esc(F.current) + '" data-act="pf" data-field="current" data-key="pf-cur"></div>' +
      '<div class="field"><label for="pf-new">New password (at least 8 characters)</label><input id="pf-new" type="password" autocomplete="new-password" value="' + esc(F.password) + '" data-act="pf" data-field="password" data-key="pf-new"></div>' +
      (F.error ? '<p class="error" role="alert">' + esc(F.error) + '</p>' : '') +
      '<div class="pin-actions"><button type="button" class="btn ghost" data-act="pw-close" data-key="pf-cancel">Cancel</button>' +
      '<button type="submit" class="btn" data-key="pf-save"' + (F.busy ? ' disabled' : '') + '>' + (F.busy ? 'Saving…' : 'Save') + '</button></div></form>';
  }

  async function loadUsers() {
    S.users = 'loading';
    try { S.users = (await api('users')).users || []; }
    catch (e) { S.users = { error: e.message }; }
    render();
  }

  function keypad() {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
    return '<div class="keypad" role="group" aria-label="PIN keypad">' + keys.map((k) => {
      if (!k) return '<span></span>';
      if (k === 'del') return '<button type="button" class="key key-del" data-act="pin-del" data-key="pin-del" aria-label="Delete last digit"' + (S.pinBusy ? ' disabled' : '') + '>' + icon('back', 24) + '</button>';
      return '<button type="button" class="key" data-act="pin-digit" data-d="' + k + '" data-key="pin-' + k + '"' + (S.pinBusy ? ' disabled' : '') + '>' + k + '</button>';
    }).join('') + '</div>';
  }

  function pinView() {
    const unlocking = S.gate === 'pin';
    const vault = readVault();
    const slots = unlocking && vault ? vault.len : Math.max(PIN_MIN, S.pinEntry.length);
    const dots = Array.from({ length: slots }, (_, i) => '<span class="dot' + (i < S.pinEntry.length ? ' filled' : '') + '"></span>').join('');
    const title = unlocking ? 'Enter your PIN' : S.pinStage === 'confirm' ? 'Confirm your PIN' : (vault ? 'Choose a new PIN' : 'Choose a PIN');
    const sub = unlocking ? (S.pinBusy ? 'Checking…' : 'Unlock Home')
      : S.pinStage === 'confirm' ? 'Enter the same PIN again.' : PIN_MIN + ' to ' + PIN_MAX + ' digits. You\'ll use it instead of your password on this device.';
    const canContinue = !unlocking && S.pinStage === 'enter' && S.pinEntry.length >= PIN_MIN;
    return '<div class="gate"><div class="gate-box pin-box">' +
      '<span class="gate-mark"><img src="/icons/logo.webp" alt="" width="64" height="64"></span>' +
      '<h1 class="title">' + title + '</h1><p>' + esc(sub) + '</p>' +
      '<div class="pin-dots" aria-hidden="true">' + dots + '</div>' +
      '<p class="sr-only" aria-live="polite">' + S.pinEntry.length + ' digits entered</p>' +
      (S.pinError ? '<p class="error" role="alert">' + esc(S.pinError) + '</p>' : '') +
      keypad() +
      (unlocking
        ? '<button class="btn ghost" type="button" data-act="pin-forgot" data-key="pin-forgot">Use password instead</button>'
        : '<div class="pin-actions">' +
          '<button class="btn ghost" type="button" data-act="pin-cancel" data-key="pin-cancel">Cancel</button>' +
          (S.pinStage === 'enter' ? '<button class="btn" type="button" data-act="pin-next" data-key="pin-next"' + (canContinue ? '' : ' disabled') + '>Continue</button>' : '') +
          '</div>') +
      '</div></div>';
  }

  function gateView() {
    if (S.gate === 'pin' || S.gate === 'pin-new') return pinView();
    const setup = S.gate === 'setup';
    return '<div class="gate"><form class="gate-box" data-act="unlock" novalidate>' +
      '<span class="gate-mark"><img src="/icons/logo.webp" alt="" width="64" height="64"></span>' +
      '<h1 class="title">' + (setup ? 'Finish setting up your server' : 'Sign in to Home') + '</h1>' +
      (setup
        ? '<p>' + esc(S.gateError) + ' Add the environment variables listed in the README to your Vercel project, redeploy, then try again.</p>' +
          '<button class="btn" type="button" data-act="retry" data-key="retry">Try again</button>'
        : '<p>Enter your password. The owner uses APP_PASSWORD from Vercel; others use the password an admin gave them.</p>' +
          '<div class="field"><label for="pw">Password</label><input id="pw" name="pw" type="password" autocomplete="current-password" required data-key="pw"></div>' +
          (S.gateError ? '<p class="' + (S.gateError === 'Signing in…' ? 'note' : 'error') + '" role="alert">' + esc(S.gateError) + '</p>' : '') +
          '<button class="btn" type="submit" data-key="unlock">Sign in</button>') +
      '<button class="btn ghost" type="button" data-act="demo" data-key="demo">Preview with sample devices</button>' +
      '</form></div>';
  }

  // ---------- Render ----------
  let shell = null;
  let lastRouteKey = '';
  let lastTab = '';
  function buildShell() {
    const app = $('#app');
    app.innerHTML = '<nav class="rail" aria-label="Main"></nav><main class="main" id="main"></main><aside class="panel" aria-label="Details"></aside><nav class="tabbar" aria-label="Main"></nav>' +
      '<div class="scroll-edge top" aria-hidden="true"></div><div class="scroll-edge bottom" aria-hidden="true"></div>';
    shell = { app, rail: $('.rail', app), main: $('.main', app), panel: $('.panel', app), tabbar: $('.tabbar', app) };
  }

  // Gentle page transitions: deeper screens slide in from the right, going back slides from the left,
  // switching tabs fades. Skipped after a swipe-back (it already animated) and for reduced motion.
  const DEPTH = { devices: 1, scenes: 1, me: 1, device: 2, 'scene-edit': 2, 'auto-edit': 2, icons: 2, changelog: 3, activity: 2, backgrounds: 3, history: 2, people: 2, appearance: 2, settings: 2, about: 2, attention: 2, kiosk: 2 };
  let skipAnim = false;
  function animateRoute(from, to, isWide) {
    if (skipAnim) { skipAnim = false; return; }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (isWide && (from === 'devices' || from === 'device') && (to === 'devices' || to === 'device')) return; // panel swap on tablets
    const a = DEPTH[from] || 1, b = DEPTH[to] || 1;
    const cls = b > a ? 'enter-forward' : b < a ? 'enter-back' : 'enter-fade';
    const el = shell.main;
    el.classList.remove('enter-forward', 'enter-back', 'enter-fade');
    void el.offsetWidth;  // restart the animation
    el.classList.add(cls);
    clearTimeout(animateRoute.t);
    animateRoute.t = setTimeout(() => el.classList.remove(cls), 400);
  }

  function render() {
    const app = $('#app');
    const focusKey = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.key : null;
    const rowScroll = {};   // sideways rows (AC modes) keep their position across redraws
    document.querySelectorAll('.ka-icons[data-key]').forEach((n) => { rowScroll[n.dataset.key] = n.scrollLeft; });

    if (S.gate) {
      shell = null;
      app.className = '';
      app.innerHTML = gateView();
      const pw = $('#pw');
      if (pw && (!focusKey || focusKey === 'pw')) pw.focus();
      else if (focusKey) {
        const t = document.querySelector('[data-key="' + CSS.escape(focusKey) + '"]:not([disabled])');
        if (t) t.focus({ preventScroll: true });
      }
      return;
    }
    if (!shell) buildShell();

    const r = route();
    const isWide = wide.matches;
    const activeTab = (r.view === 'device' || r.view === 'history') ? 'devices' : (r.view === 'scene-edit' || r.view === 'auto-edit') ? 'scenes' : (r.view === 'icons' || r.view === 'changelog' || r.view === 'activity' || r.view === 'backgrounds' || r.view === 'kiosk' || ME_PAGES.includes(r.view)) ? 'me' : r.view;
    let mainHtml, panelHtml = null;

    if (r.view === 'history') {
      mainHtml = historyView(r.id);
    } else if (r.view === 'device' && !isWide) {
      mainHtml = detailView(findDevice(r.id), false);
      if (r.id && S.data && !S.specs[r.id]) loadSpec(r.id, true);
    } else if (activeTab === 'devices') {
      const devices = S.data ? S.data.devices : [];
      const firstCard = devices.find((d) => !isReadingDevice(d)) || devices[0];
      const selId = (r.view === 'device' && r.id) || (firstCard && firstCard.id);
      mainHtml = devicesView(isWide ? selId : null);
      if (isWide) {
        panelHtml = S.data ? detailView(findDevice(selId), true) : '';
        if (selId && S.data && !S.specs[selId]) loadSpec(selId, true);
      }
    } else if (r.view === 'scene-edit') {
      mainHtml = sceneEditorView(r.id, 'scene');
    } else if (r.view === 'auto-edit') {
      mainHtml = sceneEditorView(r.id, 'auto');
    } else if (r.view === 'icons') {
      mainHtml = iconsView();
    } else if (r.view === 'changelog') {
      mainHtml = changelogView();
    } else if (r.view === 'activity') {
      mainHtml = activityView();
    } else if (r.view === 'backgrounds') {
      mainHtml = backgroundsView();
    } else if (r.view === 'kiosk') {
      mainHtml = kioskView();
    } else if (r.view === 'people') {
      mainHtml = peopleView();
    } else if (r.view === 'appearance') {
      mainHtml = appearanceView();
    } else if (r.view === 'settings') {
      mainHtml = settingsView();
    } else if (r.view === 'about') {
      mainHtml = aboutView();
    } else if (r.view === 'attention') {
      mainHtml = attentionView();

    } else if (activeTab === 'scenes') {
      mainHtml = scenesView(!isWide);
      if (isWide) panelHtml = automationsPanel();
    } else {
      mainHtml = meView();
    }

    const mainTop = shell.main.scrollTop, panelTop = shell.panel.scrollTop;
    const oldList = shell.main.querySelector('.dv-scroll'), listTop = oldList ? oldList.scrollTop : 0;
    const devicesPage = activeTab === 'devices' && !(r.view === 'device' && !isWide) && !!S.data;
    shell.main.classList.toggle('devices-view', devicesPage);
    document.documentElement.classList.toggle('lock-scroll', devicesPage);
    if (r.view !== 'devices' && S.reorder) S.reorder = false;
    document.documentElement.classList.toggle('kiosk', r.view === 'kiosk');
    if (render.lastView !== r.view + (r.id || '')) { document.documentElement.classList.remove('tab-min'); render.lastView = r.view + (r.id || ''); }
    if (r.view !== 'kiosk' && kiosk.on) kioskStop();
    document.documentElement.classList.toggle('in-editor', r.view === 'scene-edit' || r.view === 'auto-edit');
    shell.app.className = 'app' + (panelHtml == null ? ' no-panel' : '');
    shell.rail.innerHTML = '<span class="mark" aria-hidden="true"><img src="/icons/logo.webp" alt="" width="48" height="48"></span>' + tabs(activeTab);
    shell.tabbar.innerHTML = tabs(activeTab);
    shell.main.innerHTML = mainHtml;
    shell.panel.innerHTML = panelHtml || '';
    shell.main.scrollTop = mainTop;
    shell.panel.scrollTop = panelTop;
    const newList = shell.main.querySelector('.dv-scroll');
    if (newList && oldList) newList.scrollTop = listTop;
    if (newList) newList.classList.toggle('scrolled', newList.scrollTop > 2);

    const routeKey = r.view + ':' + (r.id || '');
    if (routeKey !== lastRouteKey && lastRouteKey) animateRoute(lastRouteKey.split(':')[0], r.view, isWide);
    if (routeKey !== lastRouteKey) {
      if (!isWide || activeTab !== lastTab) {
        window.scrollTo(0, 0); shell.main.scrollTop = 0;
        const l = shell.main.querySelector('.dv-scroll'); if (l && r.view === 'devices' && lastRouteKey.indexOf('device:') !== 0) l.scrollTop = 0;
      }
      shell.panel.scrollTop = 0;
      lastRouteKey = routeKey;
      lastTab = activeTab;
    }

    if (focusKey) {
      const target = Array.from(document.querySelectorAll('[data-key="' + CSS.escape(focusKey) + '"]:not([disabled])'))
        .find((n) => n.offsetParent !== null);
      if (target) target.focus({ preventScroll: true });
    }
    replayMotion();
    restoreRows(rowScroll);
  }
  function restoreRows(saved) {
    document.querySelectorAll('.ka-icons[data-key]').forEach((n) => {
      if (n.scrollWidth <= n.clientWidth + 1) return;
      if (saved[n.dataset.key] != null) n.scrollLeft = saved[n.dataset.key];
      // Keep the selected mode in view.
      const b = n.querySelector('[aria-pressed="true"]');
      if (!b) return;
      const l = b.offsetLeft - n.offsetLeft, r = l + b.offsetWidth;
      if (l < n.scrollLeft + 8) n.scrollLeft = Math.max(0, l - 24);
      else if (r > n.scrollLeft + n.clientWidth - 8) n.scrollLeft = r - n.clientWidth + 24;
    });
  }

  // ---------- Smooth switch motion ----------
  // The screen is redrawn right after a tap and again when the device answers. Each new copy of the
  // switch picks the slide up where the previous copy was (a negative animation delay), so the
  // motion plays once, start to finish, however many times the screen is redrawn meanwhile.
  const motion = {};            // data-key -> { t: when tapped, on: the state it's moving to }
  const MOTION_MS = 480;
  function noteMotion(el) {
    if (!el || !el.dataset || !el.dataset.key || !el.hasAttribute('aria-checked')) return;
    motion[el.dataset.key] = { t: performance.now(), on: el.getAttribute('aria-checked') !== 'true' };
  }
  function replayMotion() {
    const now = performance.now();
    for (const key of Object.keys(motion)) {
      const m = motion[key], elapsed = now - m.t;
      if (elapsed > MOTION_MS) { delete motion[key]; continue; }
      document.querySelectorAll('[data-key="' + CSS.escape(key) + '"]').forEach((el) => {
        if ((el.getAttribute('aria-checked') === 'true') !== m.on) return;   // didn't change (yet): nothing to animate
        el.classList.remove('m-on', 'm-off');
        el.style.setProperty('--m-delay', (-elapsed).toFixed(0) + 'ms');
        el.classList.add(m.on ? 'm-on' : 'm-off');
      });
    }
  }

  // ---------- Events ----------
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'FORM') return;
    const act = el.dataset.act, id = el.dataset.id;
    const d = id ? findDevice(id) : null;

    switch (act) {
      case 'tab': if (inEditor() && editorDirty()) leaveEditor(el.dataset.tab); else go(el.dataset.tab); break;
      case 'room': S.room = el.dataset.room; S.allOffArmed = 0; render(); break;
      case 'kroom': S.kRoom = el.dataset.room; store.set('kRoom', S.kRoom); render(); break;
      case 'open': go('device/' + encodeURIComponent(id)); break;
      case 'back': go('devices'); break;
      case 'reorder': S.reorder = !S.reorder; render(); break;
      case 'kiosk-enter': kioskStart(); break;
      case 'kiosk-wake': kiosk.wokeUntil = Date.now() + 60000; kioskTick(); break;
      case 'toggle': {
        if (!d) return;
        if (el.dataset.swiped) return;
        noteMotion(el);
        if (kindOf(d) === 'irac') { sendIrAc(d, { power: !isOn(d) }); break; }
        if (el.dataset.code) {
          const c = el.dataset.code;
          send(d, [{ code: c, value: !d.status[c] }], { [c]: !d.status[c] });
          break;
        }
        if (isMulti(d)) {
          const target = !channelCodes(d).some((c) => d.status[c]);
          const cmds = channelCodes(d).map((c) => ({ code: c, value: target }));
          send(d, cmds, Object.fromEntries(cmds.map((c) => [c.code, c.value])));
          break;
        }
        const pc = powerCode(d);
        if (pc) send(d, [{ code: pc, value: !d.status[pc] }], { [pc]: !d.status[pc] });
        break;
      }
      case 'warmth': {
        if (!d) return;
        const wc = warmCode(d); if (!wc) return;
        const value = fromPct(Number(el.dataset.pct), lightRange(d, wc, true));
        const cmds = [{ code: wc, value }];
        if ('work_mode' in d.status && d.status.work_mode !== 'white') cmds.unshift({ code: 'work_mode', value: 'white' });
        const pc = powerCode(d);
        if (pc && !d.status[pc]) cmds.unshift({ code: pc, value: true });
        send(d, cmds, Object.fromEntries(cmds.map((c) => [c.code, c.value])));
        break;
      }
      case 'temp': {
        if (!d) return;
        const sp = specOf(d, 'temp_set');
        const scale = sp && typeof sp.scale === 'number' ? sp.scale : (Math.abs(d.status.temp_set) >= 60 ? 1 : 0);
        const step = (sp && sp.step) || Math.pow(10, scale);
        const min = sp && typeof sp.min === 'number' ? sp.min : 16 * Math.pow(10, scale);
        const max = sp && typeof sp.max === 'number' ? sp.max : 30 * Math.pow(10, scale);
        sendSoon(d, 'temp_set', clamp(d.status.temp_set + Number(el.dataset.delta) * step, min, max));
        break;
      }
      case 'energy-retry': if (d) { delete S.energy[d.id]; render(); } break;
      case 'lmode': {
        if (!d) break;
        if (el.dataset.val === 'colour') sendColour(d, currentColour(d));
        else {
          const cmds = [{ code: 'work_mode', value: 'white' }], pc = powerCode(d);
          if (pc && !d.status[pc]) cmds.unshift({ code: pc, value: true });
          send(d, cmds, Object.fromEntries(cmds.map((c) => [c.code, c.value])));
        }
        break;
      }
      case 'swatch': {
        if (!d) break;
        const m = colourMax(colourCode(d)), c = currentColour(d);
        sendColour(d, { h: Number(el.dataset.h), s: m.s, v: c.v || m.v });
        break;
      }
      case 'irtemp':
        if (d && d.ir) sendIrAc(d, { power: true, temp: clamp((d.ir.state ? d.ir.state.temp : 24) + Number(el.dataset.delta), 16, 30) });
        break;
      case 'irmode': if (d && d.ir) sendIrAc(d, { power: true, mode: Number(el.dataset.v) }); break;
      case 'ac-off': {
        if (!d || !isOn(d)) break;
        if (kindOf(d) === 'irac') { sendIrAc(d, { power: false }); break; }
        const pc = powerCode(d);
        if (pc) send(d, [{ code: pc, value: false }], { [pc]: false });
        break;
      }
      case 'irwind': if (d && d.ir) sendIrAc(d, { power: true, wind: Number(el.dataset.v) }); break;
      case 'irkey': if (d && d.ir) sendIrKey(d, el.dataset.k); break;
      case 'irreload': if (d && d.ir) { delete S.irKeys[d.id]; render(); } break;
      case 'mode': {
        if (!d) break;
        const pc = powerCode(d), cmds = [{ code: 'mode', value: el.dataset.val }], patch = { mode: el.dataset.val };
        if (el.closest('.ka-menu') && pc && !d.status[pc]) { cmds.unshift({ code: pc, value: true }); patch[pc] = true; }
        send(d, cmds, patch);
        break;
      }
      case 'cover': if (d) send(d, [{ code: 'control', value: el.dataset.val }], { control: el.dataset.val }); break;
      case 'rename':
        S.renaming = { id, code: el.dataset.code };
        render();
        focusRenameInput();
        break;
      case 'rename-cancel': S.renaming = null; render(); break;
      case 'icon-open':
        S.iconPicking = S.iconPicking === id ? null : id;
        render();
        break;
      case 'icon-set':
        S.icons[id] = el.dataset.icon; saveIcons(); render(); syncIcon(id, el.dataset.icon);
        break;
      case 'icon-reset':
        delete S.icons[id]; saveIcons(); render(); syncIcon(id, null);
        break;
      case 'scene': runScene(id); break;
      case 'scene-new': S.editor = null; go('scene/new'); break;
      case 'scene-open': S.editor = null; go('scene/' + encodeURIComponent(id)); break;
      case 'se-cancel': leaveEditor('scenes'); break;
      case 'se-dup': {
        const E = S.editor;
        if (!E || !E.id) break;
        Object.assign(E, { id: null, routeId: 'new', name: (E.name.trim() + ' copy').slice(0, 40), confirmDelete: false, error: '', snap: '' });
        go((E.kind === 'auto' ? 'auto' : 'scene') + '/new');
        toast('This is a copy. Change it, then tap Create.');
        break;
      }
      case 'auto-new': S.editor = null; go('auto/new'); break;
      case 'auto-open': S.editor = null; go('auto/' + encodeURIComponent(id)); break;
      case 'se-pick-scene': S.editor.items.push({ type: 'scene', sceneId: id }); S.editor.picking = false; S.editor.error = ''; render(); break;
      case 'ae-add-timer': S.editor.conditions.push({ type: 'timer', time: '07:00', days: [true, true, true, true, true, true, true], tz: timeZone() }); S.editor.error = ''; render(); break;
      case 'ae-pick-open': S.editor.condPicking = true; render(); break;
      case 'ae-add-sun': {
        const E = S.editor;
        if (!E || E.sunBusy) break;
        E.sunBusy = true; E.error = ''; render();
        automationCity().then((city) => {
          if (S.editor !== E) return;
          E.conditions.push({ type: 'weather', cityId: city.cityId, cityName: city.cityName, disp: sunTemplate() });
        }).catch((err) => { if (S.editor === E) E.error = 'Couldn\'t add sunrise/sunset: ' + ((err && err.message) || 'unknown error'); })
          .finally(() => { if (S.editor === E) { E.sunBusy = false; render(); } });
        break;
      }
      case 'ae-wx-val': { const c = S.editor.conditions[Number(el.dataset.i)]; if (c && c.disp) { c.disp.value = el.dataset.v; render(); } break; }
      case 'ae-wx-op': { const c = S.editor.conditions[Number(el.dataset.i)]; if (c && c.disp) { c.disp.operator = el.dataset.v; render(); } break; }
      case 'ae-wx-step': { const c = S.editor.conditions[Number(el.dataset.i)]; if (c && c.disp && typeof c.disp.value === 'number') { c.disp.value = clamp(c.disp.value + Number(el.dataset.d), -40, 60); render(); } break; }
      case 'ae-pick-close': S.editor.condPicking = false; render(); break;
      case 'ae-pick-dev': {
        const dev = findDevice(id); if (!dev) break;
        const opts = triggerOptions(dev); if (!opts.length) break;
        S.editor.conditions.push(condFromOption(dev, opts[0]));
        S.editor.condPicking = false; S.editor.error = '';
        if (!S.specs[dev.id]) loadSpec(dev.id, true);
        render(); break;
      }
      case 'ae-cremove': S.editor.conditions.splice(Number(el.dataset.i), 1); render(); break;
      case 'ae-once': {
        const c = S.editor.conditions[Number(el.dataset.i)];
        if (!c) break;
        c.once = el.dataset.v === '1';
        if (c.once && !isoDate(c.date)) { const n = new Date(); n.setDate(n.getDate() + 1); c.date = n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0'); }
        if (!c.once && !c.days.some(Boolean)) c.days = [true, true, true, true, true, true, true];
        S.editor.error = ''; render(); break;
      }
      case 'ae-day': { const c = S.editor.conditions[Number(el.dataset.i)]; c.days[Number(el.dataset.d)] = !c.days[Number(el.dataset.d)]; render(); break; }
      case 'ae-match': S.editor.match = Number(el.dataset.v); render(); break;
      case 'ae-trigger': {
        const c = S.editor.conditions[Number(el.dataset.i)], dev = findDevice(c.deviceId);
        const opt = triggerOptions(dev)[Number(el.dataset.j)];
        const keep = c.thresh && opt.thresh === c.thresh ? c.value / Math.pow(10, c.scale || 0) : null;
        S.editor.conditions[Number(el.dataset.i)] = condFromOption(dev, opt, keep);
        render(); break;
      }
      case 'ae-thresh': {
        const c = S.editor.conditions[Number(el.dataset.i)];
        const step = c.thresh === 'temp' ? 1 : 5;
        const shown = c.value / Math.pow(10, c.scale || 0) + Number(el.dataset.delta) * step;
        const limited = c.thresh === 'temp' ? clamp(shown, -20, 60) : clamp(shown, 0, 100);
        c.value = Math.round(limited * Math.pow(10, c.scale || 0));
        render(); break;
      }
      case 'se-pick-open': S.editor.picking = true; render(); break;
      case 'se-pick-close': S.editor.picking = false; render(); break;
      case 'se-pick': {
        const dev = findDevice(id); if (!dev) break;
        S.editor.items.push({ type: 'device', deviceId: dev.id, props: defaultProps(dev) });
        S.editor.picking = false; S.editor.error = '';
        if (!S.specs[dev.id]) loadSpec(dev.id, true);
        render(); break;
      }
      case 'se-add-delay': S.editor.items.push({ type: 'delay', minutes: 1, seconds: 0 }); S.editor.error = ''; render(); break;
      case 'se-remove': S.editor.items.splice(Number(el.dataset.i), 1); render(); break;
      case 'se-move': {
        const i = Number(el.dataset.i), j = i + Number(el.dataset.dir), items = S.editor.items;
        if (j >= 0 && j < items.length) { const t = items[i]; items[i] = items[j]; items[j] = t; render(); }
        break;
      }
      case 'se-prop': {
        const it = S.editor.items[Number(el.dataset.i)];
        const val = JSON.parse(el.dataset.val);
        if (val === 'keep') delete it.props[el.dataset.code]; else it.props[el.dataset.code] = val;
        S.editor.error = ''; render(); break;
      }
      case 'se-temp': {
        const it = S.editor.items[Number(el.dataset.i)], dev = findDevice(it.deviceId);
        const sp = specOf(dev, 'temp_set');
        const base = it.props.temp_set ?? dev.status.temp_set;
        const scale = sp && typeof sp.scale === 'number' ? sp.scale : (Math.abs(base) >= 60 ? 1 : 0);
        const step = (sp && sp.step) || Math.pow(10, scale);
        const min = sp && typeof sp.min === 'number' ? sp.min : 16 * Math.pow(10, scale);
        const max = sp && typeof sp.max === 'number' ? sp.max : 30 * Math.pow(10, scale);
        it.props.temp_set = it.props.temp_set === undefined ? base : clamp(base + Number(el.dataset.delta) * step, min, max);
        render(); break;
      }
      case 'se-ir-power': {
        const it = S.editor.items[Number(el.dataset.i)];
        it.props = el.dataset.v === '1'
          ? { PowerOn: 'PowerOn', M: Number(it.props.M != null ? it.props.M : 0), T: Number(it.props.T != null ? it.props.T : 24), F: Number(it.props.F != null ? it.props.F : 0) }
          : { PowerOff: 'PowerOff' };
        render(); break;
      }
      case 'se-irtemp': {
        const it = S.editor.items[Number(el.dataset.i)];
        it.props.T = clamp(Number(it.props.T != null ? it.props.T : 24) + Number(el.dataset.delta), 16, 30);
        render(); break;
      }
      case 'se-irkey': {
        const it = S.editor.items[Number(el.dataset.i)];
        it.props = { [el.dataset.k]: el.dataset.k };
        S.editor.error = ''; render(); break;
      }
      case 'se-save': saveScene(); break;
      case 'se-delete': deleteScene(); break;
      case 'auto': toggleAutomation(id); break;
      case 'refresh': toast('Refreshing'); refresh({ fresh: true }); break;
      case 'install': install(); break;
      case 'lock': lockApp(); break;
      case 'signout': signOut(); break;
      case 'user-form-open': S.userForm = { name: '', password: '', role: 'member', error: '', busy: false, open: true }; render(); focusFirst('uf-name'); break;
      case 'user-form-close': S.userForm.open = false; render(); break;
      case 'user-del':
        if (S.userDelete !== id) { S.userDelete = id; render(); setTimeout(() => { if (S.userDelete === id) { S.userDelete = null; render(); } }, 4000); break; }
        S.userDelete = null; userOp({ op: 'delete', id }, 'Removed'); break;
      case 'pw-open': S.pwForm = { current: '', password: '', error: '', busy: false, open: true }; render(); focusFirst('pf-cur'); break;
      case 'pw-close': S.pwForm.open = false; render(); break;
      case 'alloff': allOff(); break;
      case 'act-more': loadActivity(true); break;
      case 'climate-toggle': S.climateOpen = !S.climateOpen; render(); break;
      case 'open-history': S.history = null; go('history/' + encodeURIComponent(id)); break;
      case 'hist-range': S.histHours = Number(el.dataset.h) === 168 ? 168 : 24; S.history = null; render(); break;
      case 'timer-add': if (d) addTimer(d, Number(el.dataset.m)); break;
      case 'timer-del': if (d) deleteTimer(d, el.dataset.t); break;
      case 'bg-set':
        S.bg = BACKGROUNDS.some(([v]) => v === el.dataset.v) ? el.dataset.v : 'system';
        store.set('bg', S.bg); applyBackground(); render();
        break;
      case 'distance':
        if (S.showDistance) { S.showDistance = false; store.set('showDistance', '0'); S.myPos = null; render(); break; }
        if (!('geolocation' in navigator)) { toast('This browser can\'t share your location.'); break; }
        S.showDistance = true; store.set('showDistance', '1'); render();
        updatePosition(true);  // asks for permission the first time
        break;
      case 'pin-setup':
        S.gate = 'pin-new'; S.pinStage = 'enter'; S.pinEntry = ''; S.pinFirst = ''; S.pinError = ''; render(); break;
      case 'pin-off':
        if (S.key) store.set('appKey', S.key);
        wipeVault(); toast('PIN turned off'); render(); break;
      case 'pin-digit': pinDigit(el.dataset.d); break;
      case 'pin-del': S.pinEntry = S.pinEntry.slice(0, -1); S.pinError = ''; render(); break;
      case 'pin-next': pinNext(); break;
      case 'pin-cancel':
        S.gate = null; S.pinEntry = ''; S.pinFirst = ''; S.pinError = ''; render(); break;
      case 'pin-forgot':
        wipeVault(); S.key = ''; store.del('appKey'); S.pinEntry = ''; S.pinError = '';
        S.gate = 'login'; S.gateError = 'Your PIN was removed from this device. Enter your password, then set up a new PIN in Me.';
        render(); break;
      case 'demo':
        S.mode = 'demo'; store.set('mode', 'demo'); S.gate = null; S.data = null; S.specs = {}; refresh(); break;
      case 'live':
        S.mode = 'live'; store.set('mode', 'live'); S.data = null; S.specs = {}; S.gateError = '';
        if (location.search.includes('demo')) history.replaceState(null, '', location.pathname + location.hash);
        if (S.key) { S.gate = null; refresh(); } else { S.gate = 'login'; render(); }
        break;
      case 'retry': S.gate = null; refresh(); break;
    }
  });

  // Sliders: update the big number live while dragging, send once on release.
  const LIVE_PREFIX = { bright: 'bright-', coverpos: 'cover-', fanspeed: 'fan-' };
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset && el.dataset.act === 'se-name' && S.editor) {
      S.editor.name = el.value;
      const st = document.querySelector('.se-status');
      if (st && S.editor.id) st.textContent = editorDirty() ? 'Unsaved changes' : 'No changes';
      return;
    }
    if (el.dataset && el.dataset.act === 'uf') { S.userForm[el.dataset.field] = el.value; return; }
    if (el.dataset && el.dataset.act === 'pf') { S.pwForm[el.dataset.field] = el.value; return; }
    if (el.dataset && el.dataset.act === 'se-delay' && S.editor) {
      const it = S.editor.items[Number(el.dataset.i)];
      if (it) it[el.dataset.field] = clamp(Math.floor(Number(el.value) || 0), 0, 59);
      return;
    }
    if (el.dataset && ['hue', 'sat', 'cbright'].includes(el.dataset.act)) {
      const ctl = el.closest('.colour-ctl'), d = findDevice(el.dataset.id);
      if (!ctl || !d) return;
      S.dragging = true;
      colourLive(ctl, d);
      return;
    }
    if (el.dataset && el.dataset.act === 'se-range') {
      document.querySelectorAll('[data-live="se-' + el.dataset.i + '-' + CSS.escape(el.dataset.code) + '"]').forEach((n) => { n.textContent = el.value + '%'; });
      return;
    }
    if (el.dataset && el.dataset.act === 'irwindr') {
      S.dragging = true;
      const v = Number(el.value);
      el.setAttribute('aria-valuetext', IR_WIND[v]);
      el.closest('.fan-range').classList.remove('is-auto');
      document.querySelectorAll('[data-live="irwind-' + CSS.escape(el.dataset.id) + '"]').forEach((n) => { n.textContent = IR_WIND[v]; });
      return;
    }
    if (!el.dataset || !LIVE_PREFIX[el.dataset.act]) return;
    S.dragging = true;
    document.querySelectorAll('[data-live="' + LIVE_PREFIX[el.dataset.act] + CSS.escape(el.dataset.id) + '"]')
      .forEach((n) => { n.textContent = el.value + '%'; });
    if (el.dataset.act === 'bright') {
      document.querySelectorAll('.arc-dial[data-id="' + CSS.escape(el.dataset.id) + '"]').forEach((dial) => {
        const p = arcPaths(Number(el.value));
        dial.querySelector('.arc-fill').setAttribute('d', p.active);
        const knob = dial.querySelector('.arc-knob');
        knob.setAttribute('cx', p.k.x.toFixed(1)); knob.setAttribute('cy', p.k.y.toFixed(1));
      });
    }
  });
  document.addEventListener('change', (e) => {
    const el = e.target;
    if (!el.dataset) return;
    const act = el.dataset.act;
    const d = el.dataset.id ? findDevice(el.dataset.id) : null;
    if (LIVE_PREFIX[act]) S.dragging = false;
    if (['hue', 'sat', 'cbright'].includes(act)) {
      S.dragging = false;
      const ctl = el.closest('.colour-ctl'), d = findDevice(el.dataset.id);
      if (ctl && d) sendColour(d, readColourCtl(ctl, d).value);
      return;
    }
    if (act === 'se-range' && S.editor) {
      const it = S.editor.items[Number(el.dataset.i)], dev = findDevice(it.deviceId), code = el.dataset.code, pct = Number(el.value);
      if (code === 'percent_control' || code === 'fan_speed_percent') it.props[code] = pct;
      else it.props[code] = fromPct(pct, lightRange(dev, code));
      render(); return;
    }
    if (act === 'se-delay' && S.editor) { render(); return; }
    if (act === 'ae-time' && S.editor) { const c = S.editor.conditions[Number(el.dataset.i)]; if (c && /^\d{2}:\d{2}$/.test(el.value)) c.time = el.value; render(); return; }
    if (act === 'ae-date' && S.editor) { const c = S.editor.conditions[Number(el.dataset.i)]; if (c && isoDate(el.value)) { c.date = isoDate(el.value); render(); } return; }
    if (act === 'uf') { S.userForm[el.dataset.field] = el.value; if (el.dataset.field === 'role') render(); return; }
    if (act === 'bg') { S.bg = BACKGROUNDS.some(([v]) => v === el.value) ? el.value : 'system'; store.set('bg', S.bg); applyBackground(); render(); return; }
    if (act === 'tempunit') { S.tempUnit = el.value === 'f' ? 'f' : 'c'; store.set('tempUnit', S.tempUnit); loadWeather(true); return; }
    if (act === 'poll') { S.pollMs = Number(el.value) || 4000; store.set('pollMs', String(S.pollMs)); schedulePoll(); toast('Live updates every ' + S.pollMs / 1000 + ' s'); return; }
    if (act === 'user-role') { userOp({ op: 'role', id: el.dataset.id, role: el.value }, 'Role updated'); return; }
    if (act === 'user-homes') {
      const homes = el.value === '' ? null : el.value === 'none' ? [] : [el.value];
      userOp({ op: 'homes', id: el.dataset.id, homes }, homes ? 'Limited to that home' : 'Access to all homes');
      return;
    }
    if (act === 'bright' && d) {
      const bc = brightCode(d);
      const value = fromPct(Number(el.value), lightRange(d, bc));
      const cmds = [{ code: bc, value }];
      const pc = powerCode(d);
      if (pc && !d.status[pc]) cmds.unshift({ code: pc, value: true });
      send(d, cmds, Object.fromEntries(cmds.map((c) => [c.code, c.value])));
    } else if (act === 'coverpos' && d) {
      send(d, [{ code: 'percent_control', value: Number(el.value) }], { percent_control: Number(el.value) });
    } else if (act === 'irwindr' && d && d.ir) {
      S.dragging = false;
      sendIrAc(d, { power: true, wind: clamp(Number(el.value), 1, 3) });
    } else if (act === 'fanspeed' && d) {
      send(d, [{ code: 'fan_speed_percent', value: Number(el.value) }], { fan_speed_percent: Number(el.value) });
    } else if (act === 'home') {
      S.homeId = el.value; store.set('homeId', el.value); S.room = 'All';
      S.data = null; S.iconPicking = null; S.renaming = null; S.sceneState = {};
      if (route().view === 'device') history.replaceState(null, '', location.pathname + location.search + '#devices');
      refresh();
    }
  });

  document.addEventListener('submit', async (e) => {
    const form = e.target;
    if (form.dataset.act === 'rename-save') {
      e.preventDefault();
      const d = findDevice(form.dataset.id);
      const name = (form.elements.name.value || '').trim();
      if (!d) return;
      if (!name) { toast('Enter a name.'); return; }
      renameChannel(d, form.dataset.code, name.slice(0, 40));
      return;
    }
    if (form.dataset.act === 'user-add') { e.preventDefault(); addUser(); return; }
    if (form.dataset.act === 'pw-save') { e.preventDefault(); changePassword(); return; }
    if (form.dataset.act !== 'unlock') return;
    e.preventDefault();
    const pw = form.elements.pw ? form.elements.pw.value : '';
    if (!pw) { S.gateError = 'Enter your password.'; render(); return; }
    S.gateError = 'Signing in…'; render();
    let token = pw;
    try {
      const res = await fetch('/api/router?r=login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.token) { token = j.token; S.me = j.user || null; S.sync = !!j.sync; }
      else if (res.status === 401 || res.status === 429) { S.gateError = j.error || 'That password isn\'t right.'; render(); return; }
      else if (res.status === 503 && j.code === 'not_configured') { S.gate = 'setup'; S.gateError = j.error; render(); return; }
      // Any other answer (e.g. an older server without /api/login): fall back to the password itself.
    } catch (err) {
      S.gateError = navigator.onLine ? 'Could not reach your server.' : 'You are offline.'; render(); return;
    }
    S.key = token; store.set('appKey', token);
    S.mode = 'live'; store.set('mode', 'live');
    S.gateError = ''; S.gate = null; S.data = null;
    await refresh();
  });

  function focusFirst(key) {
    const el = document.querySelector('[data-key="' + key + '"]');
    if (el) el.focus();
  }

  async function userOp(body, okMsg) {
    try {
      const r = await api('users', { method: 'POST', body });
      if (r.users) S.users = r.users;
      toast(okMsg);
    } catch (e) { toast(e.message); }
    render();
  }

  async function addUser() {
    const F = S.userForm;
    if (!F.name.trim()) { F.error = 'Enter a name.'; render(); return; }
    if (F.password.length < 8) { F.error = 'Passwords need at least 8 characters.'; render(); return; }
    F.busy = true; F.error = ''; render();
    try {
      let r = await api('users', { method: 'POST', body: { op: 'create', name: F.name.trim(), password: F.password, role: F.role } });
      if (F.role === 'member' && F.home) {
        const created = (r.users || []).find((u) => u.name.toLowerCase() === F.name.trim().toLowerCase());
        if (created) r = await api('users', { method: 'POST', body: { op: 'homes', id: created.id, homes: [F.home] } });
      }
      S.users = r.users || S.users;
      S.userForm = { name: '', password: '', role: 'member', error: '', busy: false, open: false };
      toast('Added. Give them their password to sign in.');
    } catch (e) { F.busy = false; F.error = e.message; }
    render();
  }

  async function changePassword() {
    const F = S.pwForm;
    if (F.password.length < 8) { F.error = 'Passwords need at least 8 characters.'; render(); return; }
    F.busy = true; F.error = ''; render();
    try {
      await api('users', { method: 'POST', body: { op: 'password', current: F.current, password: F.password } });
      S.pwForm = { current: '', password: '', error: '', busy: false, open: false };
      toast('Password changed');
    } catch (e) { F.busy = false; F.error = e.message; }
    render();
  }

  async function signOut() {
    if (S.mode === 'live') { try { await api('logout', { method: 'POST' }); } catch (e) { /* signing out locally anyway */ } }
    wipeVault(); store.del('appKey'); store.del('snap');
    S.key = ''; S.me = null; S.users = null; S.data = null; S.specs = {};
    S.gate = 'login'; S.gateError = '';
    render();
  }

  function lockApp() {
    S.data = null; S.specs = {}; S.renaming = null; S.iconPicking = null;
    S.pinEntry = ''; S.pinError = '';
    if (readVault()) {
      S.key = ''; S.gate = 'pin';
    } else {
      S.key = ''; store.del('appKey'); S.gate = 'login'; S.gateError = '';
    }
    render();
  }

  function pinDigit(d) {
    if (S.pinBusy || S.pinEntry.length >= PIN_MAX) return;
    S.pinEntry += d; S.pinError = '';
    render();
    const vault = readVault();
    if (S.gate === 'pin' && vault && S.pinEntry.length === vault.len) unlockWithPin(vault);
    else if (S.gate === 'pin-new' && S.pinStage === 'confirm' && S.pinEntry.length === S.pinFirst.length) pinNext();
  }

  async function unlockWithPin(vault) {
    S.pinBusy = true; render();
    const key = await openVault(S.pinEntry, vault);
    S.pinBusy = false; S.pinEntry = '';
    if (key) {
      store.del('pinFails');
      S.key = key; S.gate = null; S.pinError = '';
      refresh();
      return;
    }
    const fails = Number(store.get('pinFails') || 0) + 1;
    if (fails >= PIN_TRIES) {
      wipeVault();
      S.gate = 'login';
      S.gateError = 'Too many wrong PINs, so the PIN was removed from this device. Enter your password to continue.';
    } else {
      store.set('pinFails', String(fails));
      const left = PIN_TRIES - fails;
      S.pinError = 'Wrong PIN. ' + left + (left === 1 ? ' try' : ' tries') + ' left.';
    }
    render();
  }

  async function pinNext() {
    if (S.pinStage === 'enter') {
      if (S.pinEntry.length < PIN_MIN) { S.pinError = 'Use at least ' + PIN_MIN + ' digits.'; render(); return; }
      if (/^(\d)\1+$/.test(S.pinEntry) || '0123456789'.includes(S.pinEntry) || '9876543210'.includes(S.pinEntry)) {
        S.pinError = 'That PIN is too easy to guess. Try another.'; S.pinEntry = ''; render(); return;
      }
      S.pinFirst = S.pinEntry; S.pinEntry = ''; S.pinStage = 'confirm'; S.pinError = '';
      render(); return;
    }
    if (S.pinEntry !== S.pinFirst) {
      S.pinStage = 'enter'; S.pinFirst = ''; S.pinEntry = '';
      S.pinError = 'Those PINs didn\'t match. Start again.';
      render(); return;
    }
    if (!S.key) { S.gate = 'login'; render(); return; }
    S.pinBusy = true; render();
    try {
      const vault = await sealVault(S.pinEntry, S.key);
      store.set('pinVault', JSON.stringify(vault));
      store.del('pinFails');
      store.del('appKey'); // the password now lives only in encrypted form
      S.gate = null; toast('PIN is set. Use it to unlock Home on this device.');
    } catch (e) {
      S.pinError = 'Could not save the PIN on this browser.';
    }
    S.pinBusy = false; S.pinEntry = ''; S.pinFirst = ''; S.pinStage = 'enter';
    render();
  }

  // ---------- Swipe back from the left edge (phones) ----------
  const BACK = { device: 'devices', 'scene-edit': 'scenes', 'auto-edit': 'scenes', icons: 'me', changelog: 'me', activity: 'me', backgrounds: 'me', history: 'devices' };
  let edge = null;
  const standalone = () => window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  document.addEventListener('touchstart', (e) => {
    // In a browser tab the system's own back swipe already does this, so only add it to the installed app.
    if (!standalone() || wide.matches || S.gate || e.touches.length !== 1 || !shell) return;
    const t = e.touches[0];
    if (t.clientX > 24 || !BACK[route().view]) return;
    if (e.target.closest('input, select, textarea, dialog')) return;
    edge = { x0: t.clientX, y0: t.clientY, dx: 0, t0: Date.now(), active: false };
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (!edge) return;
    const t = e.touches[0], dx = t.clientX - edge.x0, dy = t.clientY - edge.y0;
    if (!edge.active) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > dx) { edge = null; return; }  // it's a vertical scroll
      if (dx < 10) return;
      edge.active = true;
      shell.main.classList.add('swiping');
    }
    edge.dx = Math.max(0, dx);
    shell.main.style.transform = 'translateX(' + edge.dx + 'px)';
  }, { passive: true });
  function endEdge(ev) {
    if (!edge) return;
    const e = edge; edge = null;
    if (!e.active) return;
    if (ev && ev.type === 'touchcancel') { e.dx = 0; }  // the system took over the gesture: just spring back
    const fast = e.dx > 40 && (e.dx / Math.max(1, Date.now() - e.t0)) > 0.5;
    const main = shell.main;
    main.classList.remove('swiping');
    if (e.dx > window.innerWidth * 0.33 || fast) {
      main.style.transition = 'transform .18s ease-out';
      main.style.transform = 'translateX(100%)';
      setTimeout(() => {
        main.style.transition = ''; main.style.transform = '';
        skipAnim = true;
        const target = BACK[route().view];
        if (route().view === 'scene-edit' || route().view === 'auto-edit') S.editor = null;
        go(target);
        main.classList.add('enter-back-soft');
        setTimeout(() => main.classList.remove('enter-back-soft'), 300);
      }, 170);
    } else {
      main.style.transition = 'transform .2s ease-out';
      main.style.transform = '';
      setTimeout(() => { main.style.transition = ''; }, 220);
    }
  }
  document.addEventListener('touchend', endEdge);
  document.addEventListener('touchcancel', endEdge);

  // Only fade the top edge of the card list once it has actually scrolled.
  document.addEventListener('scroll', (e) => {
    const el = e.target;
    if (el && el.classList && el.classList.contains('dv-scroll')) el.classList.toggle('scrolled', el.scrollTop > 2);
  }, true);

  // ---------- No zooming ----------
  // iPhone ignores user-scalable=no, so block pinch and gesture zoom here too.
  ['gesturestart', 'gesturechange', 'gestureend'].forEach((ev) => document.addEventListener(ev, (e) => e.preventDefault(), { passive: false }));
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });  // trackpad pinch on computers

  // ---------- Pull down to refresh ----------
  const PTR_TRIGGER = 64;
  let ptr = null;
  function ptrEl() {
    let el = document.getElementById('ptr');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ptr'; el.className = 'ptr'; el.setAttribute('aria-hidden', 'true');
      el.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v5h-5"/></svg>';
      document.body.appendChild(el);
    }
    return el;
  }
  function activeScroller() {
    const list = document.querySelector('.main.devices-view .dv-scroll');
    if (list) return list;
    if (wide.matches && shell) return shell.main;
    return document.scrollingElement || document.documentElement;
  }
  function ptrShow(pull) {
    const el = ptrEl(), y = Math.min(pull, 96);
    el.style.transform = 'translate(-50%, ' + (y - 48) + 'px) rotate(' + Math.round(pull * 3) + 'deg)';
    el.style.opacity = String(Math.min(1, pull / PTR_TRIGGER));
    el.classList.toggle('armed', pull >= PTR_TRIGGER);
  }
  function ptrHide() {
    const el = document.getElementById('ptr');
    if (!el) return;
    el.classList.remove('armed', 'spinning');
    el.style.transform = 'translate(-50%, -48px)'; el.style.opacity = '0';
  }
  document.addEventListener('touchstart', (e) => {
    if (S.gate || e.touches.length !== 1 || !S.data || ptr && ptr.busy) return;
    if (e.target.closest('input, select, textarea, dialog, .arc-dial, .td-dial, .ka-dial, .rocker, .hue-range, .cw-wheel, .cw-bar, .switch')) return;
    const scroller = activeScroller();
    if (!scroller || scroller.scrollTop > 0) return;
    ptr = { y0: e.touches[0].clientY, x0: e.touches[0].clientX, pull: 0, scroller };
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (!ptr || ptr.busy) return;
    const dy = e.touches[0].clientY - ptr.y0, dx = e.touches[0].clientX - ptr.x0;
    if (ptr.scroller.scrollTop > 0 || dy <= 0 || Math.abs(dx) > Math.abs(dy)) { if (!ptr.pull) ptr = null; else { ptr.pull = 0; ptrHide(); } return; }
    ptr.pull = dy * 0.5;  // resistance
    ptrShow(ptr.pull);
  }, { passive: true });
  document.addEventListener('touchend', async () => {
    if (!ptr || ptr.busy) return;
    const go = ptr.pull >= PTR_TRIGGER;
    if (!go) { ptr = null; ptrHide(); return; }
    ptr.busy = true;
    const el = ptrEl();
    el.classList.add('spinning'); el.style.opacity = '1'; el.style.transform = 'translate(-50%, 18px)';
    if (navigator.vibrate) { try { navigator.vibrate(10); } catch (e) { /* ignore */ } }
    S.energy = {};
    if (route().view === 'activity') S.activity = null;
    await refresh({ fresh: true, silent: true });
    loadWeather(true);
    ptrHide(); ptr = null;
  });

  // Physical keyboard support on the PIN screens.
  document.addEventListener('keydown', (e) => {
    if (S.gate !== 'pin' && S.gate !== 'pin-new') return;
    if (/^\d$/.test(e.key)) { e.preventDefault(); pinDigit(e.key); }
    else if (e.key === 'Backspace') { e.preventDefault(); S.pinEntry = S.pinEntry.slice(0, -1); S.pinError = ''; render(); }
    else if (e.key === 'Enter' && S.gate === 'pin-new') { e.preventDefault(); pinNext(); }
  });

  async function syncIcon(id, key) {
    if (!S.sync) return;
    try { await api('settings', { method: 'POST', body: { icons: { [id]: key } } }); }
    catch (e) { toast('Icon saved on this device only: ' + e.message); }
  }

  function focusRenameInput() {
    const input = Array.from(document.querySelectorAll('.rename input')).find((n) => n.offsetParent !== null);
    if (input) { input.focus(); input.select(); }
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && S.renaming) { S.renaming = null; render(); }
  });

  async function renameChannel(d, code, name) {
    const spec = S.specs[d.id] && S.specs[d.id] !== 'loading' ? S.specs[d.id] : (S.specs[d.id] = { codes: {}, writable: null, names: {} });
    spec.names = spec.names || {};
    const before = spec.names[code];
    spec.names[code] = name;
    S.renaming = null;
    render();
    try {
      await api('rename', { method: 'POST', body: { deviceId: d.id, code, name, homeId: S.data && S.data.homeId, deviceName: d.name } });
    } catch (e) {
      if (before === undefined) delete spec.names[code]; else spec.names[code] = before;
      render();
      toast('Rename failed: ' + e.message);
    }
  }

  async function runScene(id) {
    if (!S.data) return;
    S.sceneState[id] = 'running'; render();
    try {
      const sc = S.data.scenes.find((x) => x.id === id);
      await api('scene', { method: 'POST', body: { homeId: S.data.homeId, sceneId: id, name: sc ? sc.name : '' } });
      S.sceneState[id] = 'done'; render();
      setTimeout(() => { delete S.sceneState[id]; render(); refresh({ silent: true }); }, 1600);
    } catch (e) {
      delete S.sceneState[id]; render();
      toast('Scene did not run: ' + e.message);
    }
  }

  async function toggleAutomation(id) {
    const a = S.data && S.data.automations.find((x) => x.id === id);
    if (!a) return;
    a.enabled = !a.enabled; render();
    try {
      await api('automation', { method: 'POST', body: { homeId: S.data.homeId, automationId: id, enabled: a.enabled, name: a.name } });
    } catch (e) {
      a.enabled = !a.enabled; render();
      toast(a.name + ': ' + e.message);
    }
  }

  // ---------- Install + lifecycle ----------
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); S.installPrompt = e;
    if (!S.gate && route().view === 'me') render();
  });
  async function install() {
    if (!S.installPrompt) return;
    S.installPrompt.prompt();
    await S.installPrompt.userChoice.catch(() => null);
    S.installPrompt = null; render();
  }
  window.addEventListener('hashchange', async () => {
    // Leaving an editor with unsaved changes by the system back gesture/button: step back into the
    // editor first, then ask. In-app buttons already ask (leaveEditor) before they navigate.
    if (!inEditor() && S.editor && editorDirty() && !S.editorGuard) {
      const E = S.editor, back = (E.kind === 'auto' ? 'auto/' : 'scene/') + (E.id || E.routeId || 'new');
      S.editorGuard = true;
      history.pushState(null, '', '#' + back);
      const ok = await confirmDialog({ icon: 'pencil', title: 'Discard changes?',
        body: 'Your changes to this ' + (E.kind === 'auto' ? 'automation' : 'scene') + ' haven\'t been saved.', confirm: 'Discard' });
      if (ok) { S.editor = null; history.back(); setTimeout(() => { S.editorGuard = false; }, 300); }
      else S.editorGuard = false;
      return;
    }
    S.iconPicking = null; S.renaming = null;
    if (!inEditor()) S.editor = null;
    render();
  });
  wide.addEventListener('change', render);
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
    if (S.mode === 'live' && !S.gate && readVault() && hiddenAt && Date.now() - hiddenAt > AUTO_LOCK_MS) { lockApp(); return; }
    if (!S.gate) { refresh({ silent: true }); updatePosition(); }
  });
  // Two speeds of updates: a light status poll every few seconds (just device states, one request),
  // and a full refresh (rooms, scenes, automations...) once a minute.
  const FULL_MS = 60000;
  let lastFull = 0, statusBusy = false, pollTimer = null;
  async function pollStatus() {
    if (statusBusy || S.loading || !S.data || S.gate || document.visibilityState !== 'visible') return;
    const ids = S.data.devices.filter((d) => !d.ir || d.ir.hub === null || d.sensorOnly).map((d) => d.id);
    if (!ids.length) return;
    statusBusy = true;
    try {
      const r = await api('status?ids=' + encodeURIComponent(ids.join(',')));
      let changed = false;
      const now = Date.now();
      for (const d of S.data.devices) {
        const fresh = r.devices && r.devices[d.id];
        if (!fresh) continue;
        if (now - (S.touched[d.id] || 0) < 1500) continue; // let a just-sent command land first
        if (hasLocalChange(d.id) || S.dragging) continue;   // don't undo a change still on its way (or a drag in progress)
        if (d.ir && d.ir.ac) { if (d.online !== fresh.online) { d.online = fresh.online; changed = true; } continue; }
        if (d.online !== fresh.online || JSON.stringify(d.status) !== JSON.stringify(fresh.status)) {
          d.online = fresh.online; d.status = fresh.status; changed = true;
        }
      }
      if (changed) S.data.at = r.at;
      const typing = document.activeElement && /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName) && document.activeElement.type !== 'range';
      if (changed && !S.dragging && !S.renaming && !typing && !(S.editor && inEditor())) render();
    } catch (e) {
      if (e.code === 'unauthorized') refresh({ silent: true });
    } finally {
      statusBusy = false;
    }
  }
  function statusSoon() {
    clearTimeout(statusSoon.a); clearTimeout(statusSoon.b);
    statusSoon.a = setTimeout(pollStatus, 1600);
    statusSoon.b = setTimeout(pollStatus, 4000);
  }
  // How often to check depends on what's happening, to save Tuya API calls:
  // - in use (touched in the last 5 minutes): your Live updates setting
  // - left open but idle: every 30 s at most
  // - wall tablet mode: every 15 s (your setting for a minute after a tap), every 60 s while dimmed at night
  // The full refresh (rooms, scenes...) runs every minute, or every 5 minutes on an idle screen.
  let lastInput = Date.now();
  ['pointerdown', 'keydown', 'wheel'].forEach((t) => document.addEventListener(t, () => {
    const wasIdle = Date.now() - lastInput > IDLE_MS;
    lastInput = Date.now();
    if (wasIdle && !S.gate && S.data) { clearTimeout(pollTimer); pollTick(); }  // catch up straight away
  }, true));
  const IDLE_MS = 5 * 60000;
  function pollPlan() {
    const since = Date.now() - lastInput, k = kiosk.on;
    if (k && document.documentElement.classList.contains('k-night')) return { every: 60000, full: 10 * 60000 };
    if (k) return since < 60000 ? { every: S.pollMs, full: FULL_MS } : { every: Math.max(S.pollMs, 15000), full: 5 * 60000 };
    if (since > IDLE_MS) return { every: Math.max(S.pollMs, 30000), full: 5 * 60000 };
    return { every: S.pollMs, full: FULL_MS };
  }
  function pollTick() {
    const plan = pollPlan();
    if (document.visibilityState === 'visible' && !S.gate && !S.dragging) {
      if (Date.now() - lastFull > plan.full) refresh({ silent: true });
      else pollStatus();
    }
    pollTimer = setTimeout(pollTick, plan.every);
  }
  function schedulePoll() {
    clearTimeout(pollTimer);
    pollTimer = setTimeout(pollTick, pollPlan().every);
  }
  schedulePoll();
  window.addEventListener('online', () => { if (!S.gate) refresh({ silent: true }); });

  // Updates: when a new version is deployed, the service worker installs it and the app reloads once,
  // at a calm moment (not while typing, dragging or editing), so nobody has to close and reopen it.
  if ('serviceWorker' in navigator) {
    let reloading = false, waitingReload = false;
    const calm = () => !S.dragging && !S.renaming && !(S.editor && inEditor()) &&
      !(document.activeElement && /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName)) &&
      !document.querySelector('dialog[open]');
    const tryReload = () => {
      if (reloading) return;
      if (!calm()) { waitingReload = true; return; }
      reloading = true; location.reload();
    };
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => null); });
      }).catch(() => null);
    });
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) tryReload(); });
    setInterval(() => { if (waitingReload) tryReload(); }, 3000);
  }

  // ---------- Demo backend (sample data, no server needed) ----------
  const Demo = (function () {
    const db = {
      homes: [{ id: 'h1', name: 'My Home' }, { id: 'h2', name: 'Beach house' }],
      homeId: 'h1',
      rooms: ['Living room', 'Bedroom', 'Kitchen', 'Hallway'],
      devices: [
        { id: 'dev1', name: 'Ceiling light', category: 'dj', product: 'Smart bulb', online: true, room: 'Living room', status: { switch_led: true, work_mode: 'white', bright_value_v2: 800, temp_value_v2: 0 } },
        { id: 'dev14', name: 'Light strip', category: 'dd', product: 'RGB light strip', online: true, room: 'Living room', status: { switch_led: true, work_mode: 'colour', bright_value_v2: 800, temp_value_v2: 0, colour_data_v2: { h: 275, s: 900, v: 800 } } },
        { id: 'dev2', name: 'Floor lamp', category: 'dj', product: 'Smart bulb', online: true, room: 'Living room', status: { switch_led: false, work_mode: 'white', bright_value_v2: 450, temp_value_v2: 500 } },
        { id: 'dev9', name: 'Living room climate', category: 'wsdcg', product: 'Temperature and humidity sensor', online: true, room: 'Living room', status: { va_temperature: 215, va_humidity: 48, battery_percentage: 72 } },
        { id: 'dev13', name: 'Bedroom sensor', category: 'wsdcg', product: 'Temperature and humidity sensor', online: true, room: 'Bedroom', status: { va_temperature: 198, va_humidity: 55, battery_percentage: 15 } },
        { id: 'dev3', name: 'Air conditioner', category: 'kt', product: 'AC controller', online: true, room: 'Bedroom', status: { switch: true, temp_set: 24, temp_current: 26, mode: 'cold' } },
        { id: 'dev7', name: 'Bedroom curtains', category: 'cl', product: 'Curtain motor', online: true, room: 'Bedroom', status: { control: 'stop', percent_control: 60, percent_state: 60 } },
        { id: 'dev8', name: 'Bedside lamp', category: 'dj', product: 'Smart bulb', online: true, room: 'Bedroom', status: { switch_led: false, work_mode: 'white', bright_value_v2: 300, temp_value_v2: 0 } },
        { id: 'dev11', name: 'Donut Lamp', category: 'kg', product: '2-gang switch', online: true, room: 'Living room', status: { switch_1: true, switch_2: false } },
        { id: 'dev12', name: 'Desk power strip', category: 'pc', product: 'Power strip with USB', online: true, room: 'Bedroom', status: { switch_1: true, switch_2: true, switch_3: false, switch_usb1: true, cur_power: 865, cur_voltage: 2298, cur_current: 380, add_ele: 0 } },
        { id: 'dev4', name: 'Kettle plug', category: 'cz', product: 'Smart plug with energy monitoring', online: true, room: 'Kitchen', status: { switch_1: false, cur_power: 0, cur_voltage: 2301, cur_current: 0, add_ele: 0 } },
        { id: 'dev5', name: 'Front door', category: 'mcs', product: 'Door sensor', online: true, room: 'Hallway', status: { doorcontact_state: false, battery_percentage: 86 } },
        { id: 'dev6', name: 'Porch camera', category: 'sp', product: 'Outdoor camera', online: true, room: 'Hallway', status: {} },
        { id: 'dev10', name: 'Garage plug', category: 'cz', product: 'Smart plug', online: false, room: '', status: { switch_1: false } },
        { id: 'ir1', name: 'Study AC', category: 'infrared_ac', product: 'IR remote', online: true, room: 'Bedroom', status: {}, ir: { hub: 'hub1', categoryId: 5, ac: true, brand: 'Daikin', state: { power: false, mode: 0, temp: 24, wind: 0 } } },
        { id: 'ir2', name: 'Living room TV', category: 'infrared_tv', product: 'IR remote', online: true, room: 'Living room', status: {}, ir: { hub: 'hub1', categoryId: 2, ac: false, brand: 'Samsung' } },
        { id: 'bh1', home: 'h2', name: 'Patio lights', category: 'dj', product: 'Smart bulb', online: true, room: 'Patio', status: { switch_led: true, work_mode: 'white', bright_value_v2: 600, temp_value_v2: 0 } },
        { id: 'bh2', home: 'h2', name: 'Pool pump', category: 'cz', product: 'Smart plug', online: true, room: 'Garden', status: { switch_1: false } }
      ],
      scenes: [
        { id: 'sc1', name: 'Good morning', steps: [
          { executor: 'dpIssue', entity: 'dev1', props: { switch_led: true, bright_value_v2: 1000 } },
          { executor: 'dpIssue', entity: 'dev7', props: { control: 'open' } },
          { executor: 'dpIssue', entity: 'dev4', props: { switch_1: true } }] },
        { id: 'sc2', name: 'Movie night', steps: [
          { executor: 'dpIssue', entity: 'dev1', props: { switch_led: false } },
          { executor: 'dpIssue', entity: 'dev2', props: { switch_led: true, bright_value_v2: 300, temp_value_v2: 0 } },
          { executor: 'irIssue', entity: 'ir2', props: { key: 'Power' } }] },
        { id: 'sc4', name: 'Bedtime', steps: [
          { executor: 'dpIssue', entity: 'dev8', props: { switch_led: true, bright_value_v2: 100 } },
          { executor: 'delay', entity: 'delay', props: { hours: '0', minutes: '10', seconds: '0' } },
          { executor: 'dpIssue', entity: 'dev8', props: { switch_led: false } }] }
      ],
      automations: [
        { id: 'au4', name: 'Lamps on at sunset', enabled: true, match_type: 1,
          conditions: [{ entity_type: 3, entity_id: '2643743', entity_name: 'London', display: { code: 'sunsetrise', operator: '==', value: 'sunset' } }],
          actions: [{ action_executor: 'dpIssue', entity_id: 'dev2', executor_property: { switch_led: true } }] },
        { id: 'au1', name: 'Porch light at 7 pm', enabled: true, match_type: 1,
          conditions: [{ entity_type: 6, entity_id: 'timer', display: { time: '19:00', loops: '1111111', timezone_id: 'Europe/London' } }],
          actions: [{ action_executor: 'dpIssue', entity_id: 'dev2', executor_property: { switch_led: true } }] },
        { id: 'au2', name: 'Hall light when the door opens', enabled: true, match_type: 1,
          conditions: [{ entity_type: 1, entity_id: 'dev5', display: { code: 'doorcontact_state', operator: '==', value: true } }],
          actions: [{ action_executor: 'dpIssue', entity_id: 'dev1', executor_property: { switch_led: true } }] },
        { id: 'au3', name: 'Bedroom too warm', enabled: false, match_type: 1,
          conditions: [{ entity_type: 1, entity_id: 'dev13', display: { code: 'va_temperature', operator: '>', value: 260 } }],
          actions: [{ action_executor: 'dpIssue', entity_id: 'dev3', executor_property: { switch: true, temp_set: 22 } }] }
      ],
      warnings: []
    };
    const specs = {
      dj: { bright_value_v2: { min: 10, max: 1000, scale: 0, step: 1 }, temp_value_v2: { min: 0, max: 1000, scale: 0, step: 1 } },
      kt: { temp_set: { min: 16, max: 30, scale: 0, step: 1 }, temp_current: { scale: 0 }, mode: { range: ['cold', 'hot', 'wind', 'auto'] } },
      wsdcg: { va_temperature: { scale: 1 }, va_humidity: { scale: 0 } },
      cl: { percent_control: { min: 0, max: 100, scale: 0, step: 1 } },
      cz: { cur_power: { scale: 1 }, cur_voltage: { scale: 1 }, cur_current: { scale: 0 } },
      pc: { cur_power: { scale: 1 }, cur_voltage: { scale: 1 }, cur_current: { scale: 0 } }
    };
    const names = { dev12: { switch_1: 'Monitor', switch_2: 'Laptop charger' } };
    const demoIcons = { dev2: 'photocolumn', dev11: 'photodonut', dev8: 'phototable' };
    const demoTimers = {};
    const demoAct = [
      { at: Date.now() - 5 * 60000, who: 'Sam', text: 'turned off Kettle plug', home: true },
      { at: Date.now() - 52 * 60000, who: 'Owner', text: 'ran the scene "Movie night"', home: true },
      { at: Date.now() - 3 * 3600000, who: 'Sam', text: 'changed the brightness of Floor lamp', home: true },
      { at: Date.now() - 26 * 3600000, who: 'Owner', text: 'added Sam as a member', home: false },
      { at: Date.now() - 27 * 3600000, who: 'Owner', text: 'created the automation "Porch light at 7 pm"', home: true }
    ];
    let demoUsers = [{ id: 'u1', name: 'Sam', role: 'member', owner: false, homes: null }];
    const clone = (x) => JSON.parse(JSON.stringify(x));
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    async function handle(path, opts) {
      await wait(200);
      if (path.startsWith('state')) {
        const m = path.match(/homeId=([^&]+)/);
        const homeId = db.homes.some((h) => m && h.id === decodeURIComponent(m[1])) ? decodeURIComponent(m[1]) : 'h1';
        const out = clone(db);
        out.homeId = homeId;
        out.devices = out.devices.filter((d) => (d.home || 'h1') === homeId);
        out.rooms = homeId === 'h1' ? db.rooms : ['Patio', 'Garden'];
        if (homeId !== 'h1') { out.scenes = [{ id: 'sc9', name: 'Arrive', steps: [{ executor: 'dpIssue', entity: 'bh1', props: { switch_led: true } }] }]; out.automations = []; }
        out.scenes.forEach((x) => { x.actions = (x.steps || []).length; });
        out.me = { id: 'owner', name: 'Owner', role: 'admin', owner: true };
        out.sync = true;
        out.settings = { icons: Object.assign({}, demoIcons) };
        out.at = Date.now();
        return out;
      }
      if (path.startsWith('spec')) {
        const id = decodeURIComponent(path.split('deviceId=')[1] || '');
        const dev = db.devices.find((x) => x.id === id);
        return { deviceId: id, codes: clone(specs[dev && dev.category] || {}), writable: null, names: clone(names[id] || {}) };
      }
      const b = (opts && opts.body) || {};
      if (path === 'command') {
        const dev = db.devices.find((x) => x.id === b.deviceId);
        if (!dev || !dev.online) { const e = new Error('Device is offline.'); e.code = 'offline'; throw e; }
        for (const c of b.commands) dev.status[c.code] = c.value;
        demoAct.push({ at: Date.now(), who: 'Owner', text: (b.commands.some((c) => c.value === true) ? 'turned on ' : b.commands.some((c) => c.value === false) ? 'turned off ' : 'changed ') + dev.name, home: true });
        if ('cur_power' in dev.status) dev.status.cur_power = dev.id === 'dev4' ? (dev.status.switch_1 ? 21540 : 0) : dev.status.cur_power;
        if (dev.status.control === 'open') dev.status.percent_control = 100;
        if (dev.status.control === 'close') dev.status.percent_control = 0;
        if ('percent_control' in dev.status) dev.status.percent_state = dev.status.percent_control;
        return { ok: true };
      }
      if (path.startsWith('ir?')) {
        return { categoryId: 2, keys: [
          { key: 'Power', keyId: 1, name: 'Power' }, { key: 'Mute', keyId: 2, name: 'Mute' },
          { key: 'VolumeUp', keyId: 3, name: 'Volume +' }, { key: 'VolumeDown', keyId: 4, name: 'Volume −' },
          { key: 'ChannelUp', keyId: 5, name: 'Channel +' }, { key: 'ChannelDown', keyId: 6, name: 'Channel −' },
          { key: 'Input', keyId: 7, name: 'Input' }, { key: 'Menu', keyId: 8, name: 'Menu' }, { key: 'OK', keyId: 9, name: 'OK' }
        ] };
      }
      if (path === 'ir') {
        const dev = db.devices.find((x) => x.id === b.remoteId);
        if (b.action === 'ac' && dev) dev.ir.state = { power: b.power === 1, mode: b.mode, temp: b.temp, wind: b.wind };
        return { ok: true };
      }
      if (path.startsWith('energy')) {
        const days = [0.32, 0.41, 0.28, 0.55, 0.47, 0.6, 0.21].map((k, i) => {
          const t = new Date(); t.setDate(t.getDate() - 6 + i);
          return { day: t.getFullYear() + String(t.getMonth() + 1).padStart(2, '0') + String(t.getDate()).padStart(2, '0'), kwh: k };
        });
        return { available: true, days, today: 0.21, week: 2.84, total: 142.6 };
      }
      if (path.startsWith('weather')) {
        const f = /unit=f/.test(path);
        return { available: true, temp: f ? 75 : 24, code: 2, isDay: true, unit: f ? '°F' : '°C', place: 'Demo', lat: 51.5074, lon: -0.1278 };
      }
      if (path.startsWith('history')) {
        const hours = /hours=168/.test(path) ? 168 : 24, end = Date.now(), start = end - hours * 3600000;
        const mk = (base, amp, noise) => Array.from({ length: 96 }, (_, i) => {
          const t = start + (i + 0.5) * (end - start) / 96;
          const day = Math.sin(((new Date(t).getHours() + new Date(t).getMinutes() / 60) - 9) / 24 * 2 * Math.PI);
          return [Math.round(t), base + amp * day + (Math.sin(i * 1.7) * noise)];
        });
        const series = {};
        if (/va_temperature/.test(path)) series.va_temperature = { scale: 1, points: mk(205, 25, 1) };
        if (/va_humidity/.test(path)) series.va_humidity = { scale: 0, points: mk(52, -8, 0.4) };
        return { hours, start, end, series, reasons: [] };
      }
      if (path.startsWith('timer')) {
        const id = decodeURIComponent((path.match(/deviceId=([^&]+)/) || [])[1] || b.deviceId || '');
        demoTimers[id] = demoTimers[id] || [];
        if (path.startsWith('timer?')) return { timers: clone(demoTimers[id]) };
        if (b.op === 'add') demoTimers[id].push({ id: 't' + Date.now(), name: 'Home', time: b.time, date: b.date, loops: '0000000', functions: b.functions });
        if (b.op === 'delete') demoTimers[id] = demoTimers[id].filter((t) => t.id !== b.timerId);
        return { ok: true };
      }
      if (path.startsWith('irspec')) {
        const ac = /ir1/.test(path);
        return ac ? { available: true, isAc: true, functions: [{ code: 'PowerOn', name: 'Power on' }, { code: 'PowerOff', name: 'Power off' }, { code: 'T', name: 'Temperature' }, { code: 'M', name: 'Mode' }, { code: 'F', name: 'Fan' }], modes: [0, 1, 2, 3, 4] }
          : { available: true, isAc: false, functions: [{ code: 'PowerOn', name: 'Power on' }, { code: 'PowerOff', name: 'Power off' }, { code: 'Volume+', name: 'Volume +' }, { code: 'Volume-', name: 'Volume −' }, { code: 'Mute', name: 'Mute' }, { code: 'Input', name: 'Input' }] };
      }
      if (path.startsWith('activity')) return { entries: demoAct.slice().sort((a, b) => b.at - a.at).map((e, i) => Object.assign({ id: 'a' + i }, e)), more: false };
      if (path.startsWith('status')) {
        const out = {};
        db.devices.forEach((x) => { out[x.id] = { online: x.online, status: clone(x.status) }; });
        return { at: Date.now(), devices: out };
      }
      if (path === 'settings') { Object.entries((b.icons) || {}).forEach(([k, v]) => { if (v === null) delete demoIcons[k]; else demoIcons[k] = v; }); return { icons: demoIcons }; }
      if (path === 'logout') return { ok: true };
      if (path === 'users') {
        if (!opts || !opts.method || opts.method === 'GET') return { users: clone(demoUsers) };
        if (b.op === 'create') {
          if (demoUsers.some((u) => u.name.toLowerCase() === String(b.name).toLowerCase())) { const e = new Error('That name is taken.'); throw e; }
          demoUsers.push({ id: 'u' + Date.now(), name: b.name, role: b.role, owner: false });
        }
        if (b.op === 'role') demoUsers.forEach((u) => { if (u.id === b.id) u.role = b.role; });
        if (b.op === 'homes') demoUsers.forEach((u) => { if (u.id === b.id) u.homes = b.homes; });
        if (b.op === 'delete') demoUsers = demoUsers.filter((u) => u.id !== b.id);
        return { users: clone(demoUsers) };
      }
      if (path.startsWith('automation-edit?') && /[?&]city=1/.test(path)) return { cityId: '2643743', cityName: 'London' };
      if (path.startsWith('automation-edit?')) {
        const id = decodeURIComponent((path.match(/[?&]id=([^&]+)/) || [])[1] || '');
        const a = db.automations.find((x) => x.id === id);
        if (!a) { const e = new Error('Automation not found.'); throw e; }
        return clone(a);
      }
      if (path === 'automation-edit') {
        if (b.op === 'create') db.automations.push({ id: 'au' + Date.now(), name: b.name, enabled: true, match_type: b.match_type, conditions: b.conditions, actions: b.actions });
        if (b.op === 'update') { const a = db.automations.find((x) => x.id === b.automationId); if (a) Object.assign(a, { name: b.name, match_type: b.match_type, conditions: b.conditions, actions: b.actions }); }
        if (b.op === 'delete') db.automations = db.automations.filter((x) => x.id !== b.automationId);
        return { ok: true };
      }
      if (path === 'scene-edit') {
        const toSteps = (acts) => acts.map((a) => ({ executor: a.action_executor, entity: a.entity_id || (a.action_executor === 'delay' ? 'delay' : ''), props: a.executor_property || {} }));
        if (b.op === 'create') db.scenes.push({ id: 'sc' + Date.now(), name: b.name, steps: toSteps(b.actions) });
        if (b.op === 'update') { const sc = db.scenes.find((x) => x.id === b.sceneId); if (sc) { sc.name = b.name; sc.steps = toSteps(b.actions); } }
        if (b.op === 'delete') db.scenes = db.scenes.filter((x) => x.id !== b.sceneId);
        return { ok: true };
      }
      if (path === 'rename') {
        names[b.deviceId] = Object.assign(names[b.deviceId] || {}, { [b.code]: b.name });
        return { ok: true };
      }
      if (path === 'scene') { await wait(600); return { ok: true }; }
      if (path === 'automation') {
        const a = db.automations.find((x) => x.id === b.automationId);
        if (a) a.enabled = !!b.enabled;
        return { ok: true };
      }
      return { ok: true };
    }
    return { handle };
  })();

  // After an update, offer to show what changed (once per version).
  (function announceUpdate() {
    const seen = store.get('seenVersion');
    store.set('seenVersion', APP_VERSION);
    if (seen && seen !== APP_VERSION) {
      setTimeout(() => toast('Updated to ' + APP_VERSION + '. Tap to see what\'s new.', () => { $('#toast').classList.remove('show'); go('changelog'); }, 7000), 1200);
    }
  })();

  // ---------- Start ----------
  if (S.mode === 'live' && readVault()) { S.key = ''; store.del('appKey'); S.gate = 'pin'; }
  else if (S.mode === 'live' && !S.key) S.gate = 'login';
  if (!S.gate && S.mode === 'live') {
    const snap = loadSnapshot();
    if (snap) { S.data = snap; if (snap.me) S.me = snap.me; S.sync = !!snap.sync; }
  }
  render();
  if (!S.gate) refresh();
})();
