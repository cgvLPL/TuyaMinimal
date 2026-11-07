# Changelog

Newest first. The same list is in the app under **Me → About → Version**.

## 2.36.0

- Fewer Tuya API calls: open screens share one device-status request on the server, Refresh now can skip the cache at most every 15 seconds, and the app checks less often when left idle (every 30 s), in wall tablet mode (every 15 s) and when the tablet is dimmed at night (every minute). It catches up as soon as you touch it.
- Timeouts: a Tuya request gives up after 8 seconds and the app's own requests after 20, with a clear message, instead of spinning.
- The Android back gesture (or back button) in the scene and automation editor now asks before throwing away unsaved changes.
- Faster start: the app shows your devices from last time straight away (with "Updating…") while it fetches fresh states. Smaller icons and backgrounds, the font no longer delays the first paint, and images are cached longer.

## 2.35.2

- Wall tablet mode: the AC fan speed is a slider with an Auto button, the same as on the AC screen.

## 2.35.1

- Wall tablet mode now has an Air conditioners section: each AC gets a card with power, a big target temperature with − and + buttons, mode buttons, and fan speed for IR remote ACs. ACs no longer appear as plain on/off tiles there.

## 2.35.0

- A design pass following Apple's Liquid Glass guidance. Glass is now kept for things that float above the content (tab bar, sidebar, back buttons, Save bar, dialogs), while device cards, lists and panels sit on a calmer, mostly solid surface that's easier to read.
- The phone tab bar shrinks while you scroll down and comes back when you scroll up. Lists fade softly at their edges, and buttons spring and light up when pressed.
- Rounder, matching corners (inner shapes follow their container) and section labels in normal capitalisation instead of ALL CAPS. The app follows the Reduce Transparency, Increase Contrast and Reduce Motion settings.

## 2.34.0

- Arrange your device cards: tap Arrange above the cards, drag a card by its handle (or use the arrow keys), then tap Done. The order is saved for each home and syncs across your devices when sync is on.
- Wall tablet mode (Me → Wall tablet mode): a full-screen dashboard with a big clock, weather, sensor gauges, scenes and your first 12 devices. It keeps the screen awake where the browser allows, dims itself from 22:00 to 06:00 (tap to wake), and you press and hold the ✕ to leave.

## 2.33.0

- Plain on/off devices (plugs, switches and lamps without dimming) now have a big rocker switch: the knob sits at the bottom when off and slides up, glowing, when on. Tap it, or swipe it up or down. Power strips keep the all-outlets button.

## 2.32.0

- Temperature and humidity sensors on the home screen now show round gauges with an icon, the label and the reading. The dot on each gauge marks the value (0–40° for temperature, 0–100% for humidity). Tap one for its history, as before.

## 2.31.1

- The AC and thermostat screen no longer shows the device photo above the temperature dial. The photo still shows on the device card and in the header.

## 2.31.0

- New app logo: a little house on the horizon at sunrise, on the home screen icon, the sign-in screen and the tablet sidebar. Installed apps may keep the old home screen icon until you reinstall.

## 2.30.0

- Scenes and automations explain themselves: scene cards say what they do ("Ceiling light off · Floor lamp on, 29%") and automations show when and what ("Every day at 7:00 PM → Porch light on").
- Scene and automation editor: Save stays at the bottom of the screen while you scroll, it shows when there are unsaved changes, and it asks before throwing them away. Duplicate a scene or automation to start a copy.
- A tidier Me tab: your profile, then Home, Activity, People and Device icons. Appearance (background, weather units, distance), Settings (live updates, PIN, sync) and About each have their own page.

## 2.29.0

- AC fan speed is now a slider (Low, Medium, High) with an Auto button beside it. The slider is dimmed while the fan is on Auto.

## 2.28.0

- New AC and thermostat screen: a large room temperature on the left (with an arrow when it's warming or cooling) and a dial on the right. Drag the dial up for warmer or down for cooler, tap above or below the pointer to change by one degree, or use the arrow keys. IR remotes show the blaster's own thermometer when it has one.

## 2.27.0

- More device photos: a white air conditioner, a paper lantern lamp and an orange star lamp, in Me > Device icons.

## 2.26.0

- Device photos: choose a black desk lamp, white column lamp, orange donut lamp or blue table lamp in Me > Device icons. The photo shows on the device card and its screen, with a warm glow (in the light's colour) when it is on and a muted look when it is off.

## 2.25.0

- Timers: on a device's screen, choose Turn off (or on) in 15 min, 30 min, 1 hour or 2 hours. Upcoming timers show with a Cancel button.
- Sensor history: tap a temperature or humidity reading for charts of the last 24 hours or 7 days, with low, average and high.

## 2.24.0

- Five more backgrounds: Ember, Tide, Mist, Halftone and Dusk.
- Me > Background is now a picker with previews. Photo backgrounds get a light dimming layer so text stays readable.

## 2.23.0

- Optional backgrounds: choose Aura (a soft colour glow on black) in Me > Background. The app switches to its dark look so everything stays readable.

## 2.22.0

- Redesigned to follow Apple's Liquid Glass guidelines: glass only on the navigation layer (tab bar, side rail, back buttons, alerts), standard materials for cards and lists, a plain system background, system label colours, a quiet selected-tab fill, and toggles that turn glassy while pressed. Respects Reduce Transparency and Increase Contrast.

## 2.21.1

- Calmer glass: a softer, more neutral backdrop, a subtler sheen and quieter edges, keeping the depth.

## 2.21.0

- Stronger liquid glass: clearer surfaces with more blur, a light-catching sheen and brighter edges, over a more colourful backdrop. Turn on Reduce Transparency on your phone for solid surfaces.

## 2.20.1

- Neater People list: name and Remove on one line, role and home menus side by side at equal width.

## 2.20.0

- IR remotes in scenes and automations: set an IR air conditioner's power, temperature, mode and fan, or press any button on a TV or other IR remote.

## 2.19.0

- Activity log in Me: see who turned what on or off, ran scenes, switched automations, edited scenes and automations, changed people, and signed in, for the last 30 days. Members only see their own homes.

## 2.18.0

- Optional distance from home under the greeting ("You're 12 km from home"), turned on in Me. Your location stays on your phone.
- Pinch and double-tap zoom are turned off.

## 2.17.1

- Tidier Me tab: removed the explanatory notes under Device icons and People.

## 2.17.0

- 23 new device icons: column, desk, table, pendant and wall lamps, spotlight, fairy lights, lantern, star light, night light, Christmas tree, air purifier, humidifier, water heater, coffee maker, washing machine, fridge, robot vacuum, lock, doorbell, garage, plant and pet feeder.

## 2.16.0

- What's new: this changelog, under Me > About > Version. After an update, a message offers to show what changed.

## 2.15.1

- IR air conditioners and other IR remotes show their brand (for example Bedroom, Daikin).

## 2.15.0

- Updates install themselves: the app reloads once at a quiet moment instead of needing to be reopened.
- Live updates no longer pause after touching a slider without moving it.
- No more zooming in on iPhone when tapping menus and fields.
- No double-tap zoom or text selection when tapping cards and switches.
- Swipe back only runs in the installed app, so it no longer clashes with Safari's own back swipe.
- Faster switches and live updates when people and sync are set up.

## 2.14.2

- The greeting no longer slips under the iPhone status bar blur.

## 2.14.1

- Energy history works for many more plugs: it falls back to the plug's energy reports, or estimates from its wattage.
- If history still isn't available, the Energy section explains why and offers Try again.

## 2.14.0

- Switches pulse gently until Tuya confirms a command.
- Offline devices show a clear red Offline tag.
- Swipe from the left edge to go back (installed app on phones).
- Gentle slide and fade transitions between screens.

## 2.13.1

- The first row of device cards no longer looks cut off under the header.
- The device count next to Devices is easier to read in dark mode.

## 2.13.0

- Pull down to refresh on any page.
- Energy for plugs that measure power: live watts on the card, plus volts, amps and a 7-day chart on the plug's screen.

## 2.12.0

- A more compact top section on phones: weather beside the greeting, smaller room tiles and readings.

## 2.11.0

- The bottom navigation shows icons only.

## 2.10.0

- The top of the Devices page stays put; only the device cards scroll.

## 2.9.0

- All off is a simple power button.
- Device icons moved to Me > Device icons.

## 2.8.0

- Create, edit and delete automations: times, device triggers and sensor thresholds, then devices, waits or scenes.

## 2.7.0

- A Liquid Glass look: frosted surfaces, a colourful backdrop and a floating tab bar.

## 2.6.1

- Weather shows in Celsius by default.

## 2.6.0

- The greeting says Hi with your name, plus the current weather at your home.

## 2.5.0

- Admins can limit a member to one home.

## 2.4.0

- Sync and people now use a Neon database.

## 2.3.1

- Fits Vercel's free plan: all server endpoints run through one function.

## 2.3.0

- All off asks for confirmation before turning everything off.

## 2.2.0

- A new design: greeting header, room tiles, picture-style cards and a brightness dial.

## 2.1.0

- Device states update about every 4 seconds, with a speed setting in Me.

## 2.0.0

- Colour control for RGB lights.
- All off for a room or the whole home.
- People: separate passwords for family members, with admin and member roles.
- Icons sync across devices.

## 1.7.0

- Temperature and humidity sensors show as readings above your devices.

## 1.6.0

- Create, edit and delete tap-to-run scenes.

## 1.5.0

- More reliable IR air conditioner control, with a fallback when the IR blaster can't be found.

## 1.4.0

- IR blasters: each remote you set up (AC, TV...) appears as its own device.

## 1.3.0

- Unlock the app with a PIN instead of the password.

## 1.2.0

- Switching homes shows only that home's devices.
- Choose a custom icon for any device.

## 1.1.0

- Multi-outlet devices: control each outlet or all at once, and rename outlets.

## 1.0.0

- First version: devices, rooms, scenes, automation switches, phone and tablet layouts, demo mode.

