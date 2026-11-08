# Changelog

Newest first. The same list is in the app under **Me → About → Version**.

## 2.52.1

- Wall tablet mode: AC mode symbols are in one row that slides sideways, like on the AC screen, instead of wrapping onto two lines. The next symbol fades in at the edge, the selected mode stays in view, and the row keeps its position after a tap.

## 2.52.0

- Air conditioner tiles now look like the Home app's thermostat tile: twice as tall, with the room temperature in large numbers at the top, coloured by what the AC is doing (blue cooling, orange heating, blue-to-orange auto, teal fan or dry, grey off), and the name and status ("Cooling to 24°") at the bottom. Tap the tile to open the thermostat. ACs with no thermometer show their icon at the top instead. Smaller tiles fill in beside it.

## 2.50.2

- AC screens: the mode symbols stay full size, and the row slides left and right when they don't all fit (IR ACs on phones), with a soft fade at the edges. The row keeps its position after a tap, and the selected mode is always in view.

## 2.50.1

- Fixed: on IR AC screens the six mode buttons were squeezed into ovals. They now stay round and share the row evenly.

## 2.50.0

- Air conditioner screens (phone and tablet panel) now use the thermostat from wall tablet mode: "Current" and humidity at the top, a large arc you drag to set the temperature, coloured by mode, and the modes as symbols (power, snowflake, sun, auto, fan, droplet). IR ACs keep the fan slider. The device tiles on Home are unchanged.
- Fixed: changing an AC's mode and then quickly setting the temperature could jump back to the old temperature. A status refresh no longer overwrites a change that's still being sent (this also applies to + / − buttons and sliders).

## 2.49.1

- Fixed: repeating schedules from the Tuya app (like 07:00 on weekdays) were shown as one-time schedules. Tuya also stores a date on repeating schedules. They now show their days, and saving keeps them repeating.
- Automations: sunrise/sunset and weather conditions from the Tuya app now show what they are ("At sunset", "Outside above 30°", "Weather turns rainy") with their city, instead of "Weather condition from the Tuya app". You can switch between sunrise and sunset, and change outside temperature, weather and humidity conditions.
- Automations: new Sunrise / sunset button under When. It uses the same city as your other weather automations, or Tuya's city for your home's location.

## 2.49.0

- Automations: one-time schedules made in the Tuya app now show their date and time ("Once, Tue, Nov 10 at 7:30 AM") instead of "One-off schedule from the Tuya app", and you can edit them. Each time under When has a Repeat / Once switch: Repeat picks days of the week, Once picks a date. If the date has passed, the card says so.

## 2.48.1

- Android, Windows and other devices now use Inter, a free font made to match Apple's San Francisco, so the app looks the same everywhere. Apple devices keep the real San Francisco. Inter comes with the app (about 30 KB per weight), is only downloaded on devices that need it, and works offline.

## 2.48.0

- Uses Apple's own font, San Francisco (the iOS system font), on iPhone, iPad and Mac, instead of Outfit. Other devices use their own system font. The app no longer downloads a font from Google, so the first load is a little faster.

## 2.47.0

- Colour lights: iOS 26 colour controls. A colour wheel you drag (colour around the edge, paler towards the middle), preset colours with a ring on the selected one, and a thick brightness bar filled with the current colour. White / Color is now a capsule switch with a sliding thumb.
- Fixed: since 2.44.0, opening a light in White mode could fail because the wall tablet AC dial reused a name from the brightness dial.

## 2.46.0

- Wall tablet mode: a slim row of room pills (All rooms, Living room, Bedroom...) sits above the tiles. Tap one to show only that room's devices, ACs and climate readings. The tablet remembers the choice, and it doesn't change the room on the Home tab.

## 2.45.0

- Wall tablet mode: AC modes are now round symbols instead of words: power (Off), snowflake (Cool), sun (Heat), A (Auto), fan (Fan) and droplet (Dry). The selected one fills with its colour, and its name shows underneath.

## 2.44.1

- Wall tablet mode: IR AC remote tiles are now the same size as other AC tiles. Their modes sit in two columns above the fan slider.

## 2.44.0

- Wall tablet mode: the AC widget now looks like the Home app's thermostat: the current temperature and humidity under its name, a large arc you drag to set the temperature (blue for cooling, orange for heating), "Set to" in the middle, and a mode menu with a check mark (Off, Cool, Heat, Auto...). IR ACs keep the fan slider.

## 2.43.2

- Wall tablet mode uses compact device tiles too (round icon on the left, name and state beside it), so many more devices fit on screen. Tap a tile to switch it on or off.

## 2.43.1

- Smoother switches: rocker switches, toggle switches and tile icons now slide (and change colour) in one smooth motion with a gentle spring, instead of jumping or restarting when the screen updates.

## 2.43.0

- Tidier switch-group screen: the list under the rockers is now just "Switch names" (tap one to rename it), without repeating the on/off switches.
- Faster cold starts: with the database connected, the server remembers your homes, rooms, which devices are in which room and your IR remotes (IDs and names only), so opening the app after a quiet spell asks Tuya for half as much. In tests the first load went from 0.7 s to 0.3 s. New devices still appear straight away, and Refresh now forgets the remembered details.

## 2.42.0

- Devices with several switches (2- and 3-gang wall switches, power strips) now show a rocker for each switch, like the Home app: "1 On • 2 Off" at the top, two per row with the name under each, and a Turn all on/off button. Tap a rocker or swipe it up or down. The list below still lets you rename each switch.
- Rocker switches now light up yellow with a white icon when on, like the Home app.

## 2.41.2

- Scroll bars are hidden throughout the app; scrolling works as before.

## 2.41.1

- The Arrange button above the devices is now an icon (two arrows); it turns into a checkmark while you're arranging.

## 2.41.0

- More compact device tiles, like the Home app: a short tile with the round icon on the left and the name and state beside it, so about twice as many fit on screen. Tap the icon to turn a device on or off, or the name for its full controls.

## 2.40.0

- Device cards on the home screen now match the wall tablet: glass when off, and bright white with a yellow round icon when on.

## 2.39.1

- Wall tablet mode shows temperature and humidity the same way: Climate and Humidity summary capsules above the scenes (tap to see each sensor when there are several).

## 2.39.0

- Temperature and humidity on the home screen now look like the Home app's summaries: capsule buttons at the top with an icon, "Climate" or "Humidity" and the reading (a range like 24–26° when you have several sensors). Tap one to see each sensor, or its history if you only have one.

## 2.38.0

- Wall tablet mode redesigned in the iOS 26 style. A Lock Screen-style clock sits at the top, with the date and weather above it. Scenes are capsules like the Home app. Below is a grid of glass widgets: sensors with gauges, large AC widgets, and Control Center-style device tiles that turn bright when on.
- At night (22:00–06:00) wall tablet mode now works like StandBy: only a dim red clock stays on a black screen. Tap anywhere to bring everything back for a minute.

## 2.37.1

- On iPhone the background now runs all the way to the top, behind the clock and battery, instead of a black bar. If the bar is still there after updating, remove Home from the home screen and add it again (iOS reads this setting when the app is added).

## 2.37.0

- Opening the app is faster: the server now starts all its Tuya requests side by side instead of in four or five waves, gets the Tuya sign-in ready while it checks your session, and looks up IR remotes alongside everything else. In tests with typical cross-region delays the first load went from 1.2 s to 0.7 s.
- Me → Settings shows how long the last full update took. If it's slow, see "Speed: put the server next to Tuya" in the README: choosing a Vercel function region near your Tuya data center is the biggest speed-up.

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

