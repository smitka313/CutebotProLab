/* Block definitions, the code generator (simulator + MakeCode modes), toolboxes and theme. */
(() => {
'use strict';
const L = window.Lab;
const C = L.C;

/* ---------- 5×5 LED grid field for "show leds" ---------- */
class FieldLeds extends Blockly.Field {
  constructor(value, validator) { super(value ?? '0'.repeat(25), validator); this.SERIALIZABLE = true; this.EDITABLE = true; this.CURSOR = 'pointer'; }
  static fromJson(o) { return new FieldLeds(o.value); }
  doClassValidation_(v) { return (typeof v === 'string' && /^[01]{25}$/.test(v)) ? v : null; }
  initView() {
    const S = 15, G = 3, P = 5, size = P * 2 + S * 5 + G * 4;
    Blockly.utils.dom.createSvgElement('rect', { x: 0, y: 0, width: size, height: size, rx: 6, ry: 6, fill: 'rgba(0,0,0,.25)' }, this.fieldGroup_);
    this.cells = [];
    for (let i = 0; i < 25; i++) this.cells.push(Blockly.utils.dom.createSvgElement('rect', { x: P + (i % 5) * (S + G), y: P + Math.floor(i / 5) * (S + G), width: S, height: S, rx: 3, ry: 3 }, this.fieldGroup_));
    this.boxSize = size;
  }
  updateSize_() { this.size_.width = this.boxSize || 100; this.size_.height = this.boxSize || 100; }
  render_() {
    const v = this.getValue() || '';
    this.cells?.forEach((c, i) => { const on = v[i] === '1'; c.setAttribute('fill', on ? '#ff4b3e' : 'rgba(255,255,255,.18)'); c.setAttribute('stroke', on ? '#ffd2cc' : 'rgba(255,255,255,.25)'); c.setAttribute('stroke-width', on ? 1 : .6); });
    this.updateSize_();
  }
  showEditor_(e) {
    if (!e || e.clientX === undefined || !this.cells) return;
    const v = this.getValue().split('');
    for (let i = 0; i < 25; i++) {
      const r = this.cells[i].getBoundingClientRect(), pad = 2;
      if (e.clientX >= r.left - pad && e.clientX <= r.right + pad && e.clientY >= r.top - pad && e.clientY <= r.bottom + pad) { v[i] = v[i] === '1' ? '0' : '1'; this.setValue(v.join('')); return; }
    }
  }
  getText_() { return this.getValue(); }
}
Blockly.fieldRegistry.register('field_leds', FieldLeds);

/* ---------- block definitions ---------- */
const num = (name) => ({ type: 'input_value', name, check: 'Number' });
const dd = (name, opts) => ({ type: 'field_dropdown', name, options: opts });
const txt = (name, value) => ({ type: 'field_input', name, text: value });
const hat = (type, msg, args, colour, tooltip) => ({ type, message0: msg + ' %' + (args.length + 1) + ' %' + (args.length + 2), args0: [...args, { type: 'input_dummy' }, { type: 'input_statement', name: 'DO' }], colour, tooltip });
const stmt = (type, msg, args, colour, tooltip, extra = {}) => ({ type, message0: msg, args0: args, previousStatement: null, nextStatement: null, colour, tooltip, inputsInline: true, ...extra });
const val = (type, msg, args, colour, output, tooltip) => ({ type, message0: msg, args0: args, output, colour, tooltip, inputsInline: true });

const HATS = L.HATS = new Set(['mb_on_start', 'mb_forever', 'mb_on_button', 'mb_on_gesture', 'mb_on_sound', 'mb_every', 'cb_ir_on',
  'radio_on_number', 'radio_on_string', 'radio_on_value', 'procedures_defnoreturn', 'procedures_defreturn']);
// reporters that only exist inside one kind of event block
const WHERE = { radio_number: 'radio_on_number', radio_string: 'radio_on_string', radio_name: 'radio_on_value', radio_value: 'radio_on_value' };
const HAT_LABEL = { radio_on_number: 'on radio received receivedNumber', radio_on_string: 'on radio received receivedString', radio_on_value: 'on radio received name value', cb_ir_on: 'on IR receiving' };

const iconOpts = Object.keys(L.ICONS).map(k => [L.ICON_LABELS[k] || k.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase(), k]);
const noteOpts = L.NOTES.map(n => [n[0], n[1]]);
const beatOpts = L.BEATS.map(b => [b[0] + ' beat', b[1]]);
// dropdowns use the Cutebot Pro extension's own words and enum members
const lightOpts = [['left RGB', 'RGBL'], ['right RGB', 'RGBR'], ['all RGB lights', 'RGBA']];
const motorOpts = [['all wheel', 'ALL'], ['left wheel', 'M1'], ['right wheel', 'M2']], motor1Opts = [['left wheel', 'M1'], ['right wheel', 'M2']];
const wheelOpts = [['left wheel', 'LeftWheel'], ['right wheel', 'RightWheel'], ['all wheel', 'AllWheel']];
const speedUnitOpts = [['cm/s', 'Cms'], ['inch/s', 'Ins']], distUnitOpts = [['cm', 'Cm'], ['inch', 'Ft']], dirOpts = [['forward', 'Advance'], ['reverse', 'Retreat']];
const turnOpts = [['turn left', 'Left'], ['turn right', 'Right'], ['turn left at place', 'LeftInPlace'], ['turn right at place', 'RightInPlace']];
const chanOpts = [['1', 'One'], ['2', 'Two'], ['3', 'Three'], ['4', 'Four']], servoOpts = [['S1', 'S1'], ['S2', 'S2'], ['S3', 'S3'], ['S4', 'S4']];
const btnOpts = [['A', 'A'], ['B', 'B'], ['A+B', 'AB']];
const irOpts = L.IR_BUTTONS.map(b => [b[2] === b[0] ? b[0] : `${b[0]} (${b[2]})`, b[0]]);

L.BLOCKS = [
  hat('mb_on_start', 'on start', [], C.basic, 'Runs once when the program starts'),
  hat('mb_forever', 'forever', [], C.basic, 'Repeats the code forever, after on start finishes'),
  stmt('mb_show_number', 'show number %1', [num('NUM')], C.basic, 'Scroll a number on the screen'),
  { type: 'mb_show_leds', message0: 'show leds %1', args0: [{ type: 'input_dummy' }], message1: '%1', args1: [{ type: 'field_leds', name: 'LEDS', value: '0'.repeat(25) }], previousStatement: null, nextStatement: null, colour: C.basic, tooltip: 'Click the squares to draw a picture' },
  stmt('mb_show_icon', 'show icon %1', [dd('ICON', iconOpts)], C.basic, 'Show a built-in picture'),
  stmt('mb_show_string', 'show string %1', [{ type: 'input_value', name: 'TEXT', check: 'String' }], C.basic, 'Scroll text on the screen'),
  stmt('mb_clear', 'clear screen', [], C.basic, 'Turn off all the LEDs'),
  stmt('mb_pause', 'pause (ms) %1', [num('MS')], C.basic, 'Wait this many milliseconds'),
  stmt('mb_show_arrow', 'show arrow %1', [dd('DIR', Object.keys(L.ARROWS).map(k => [k.replace(/([a-z])([A-Z])/g, '$1 $2'), k]))], C.basic, 'Show an arrow'),

  hat('mb_on_button', 'on button %1 pressed', [dd('BTN', btnOpts)], C.input, 'Runs when you press and release a button'),
  hat('mb_on_gesture', 'on %1', [dd('G', [['shake', 'Shake'], ['logo up', 'LogoUp'], ['logo down', 'LogoDown'], ['screen up', 'ScreenUp'], ['screen down', 'ScreenDown'], ['tilt left', 'TiltLeft'], ['tilt right', 'TiltRight']])], C.input, 'Runs when the micro:bit is moved this way'),
  val('mb_button_pressed', 'button %1 is pressed', [dd('BTN', btnOpts)], C.input, 'Boolean', 'True while the button is held down'),
  val('mb_acceleration', 'acceleration (mg) %1', [dd('DIM', [['x', 'X'], ['y', 'Y'], ['z', 'Z'], ['strength', 'Strength']])], C.input, 'Number', 'Tilt and movement, from -1023 to 1023 per direction'),
  val('mb_temperature', 'temperature (°C)', [], C.input, 'Number', 'Temperature in degrees Celsius'),
  val('mb_light', 'light level', [], C.input, 'Number', 'Light level from 0 (dark) to 255 (bright)'),
  val('mb_compass', 'compass heading (°)', [], C.input, 'Number', 'Direction the robot faces, 0 to 359 degrees'),
  val('mb_running_time', 'running time (ms)', [], C.input, 'Number', 'Milliseconds since the program started'),
  hat('mb_on_sound', 'on %1 sound', [dd('S', [['loud', 'Loud'], ['quiet', 'Quiet']])], C.input, 'Runs when the micro:bit V2 microphone hears a sound louder (or quieter) than the threshold'),
  val('mb_sound_level', 'sound level', [], C.input, 'Number', 'How loud it is around the micro:bit V2, from 0 (silent) to 255 (very loud)'),
  stmt('mb_sound_threshold', 'set %1 sound threshold to %2', [dd('S', [['loud', 'Loud'], ['quiet', 'Quiet']]), num('V')], C.input, 'The level (0-255) that counts as a loud or quiet sound. Loud starts at 128.'),

  stmt('mb_play_tone', 'play tone %1 for %2', [dd('NOTE', noteOpts), dd('BEAT', beatOpts)], C.music, 'Play a note and wait until it finishes'),
  stmt('mb_ring_tone', 'ring tone (Hz) %1', [dd('NOTE', noteOpts)], C.music, 'Play a note until another sound or rest'),
  stmt('mb_rest', 'rest for %1', [dd('BEAT', beatOpts)], C.music, 'Silence for a number of beats'),
  stmt('mb_tempo', 'set tempo to (bpm) %1', [num('BPM')], C.music, 'Beats per minute'),
  stmt('mb_stop_sounds', 'stop all sounds', [], C.music, 'Stop any sound that is playing'),

  stmt('mb_plot', 'plot x %1 y %2', [num('X'), num('Y')], C.led, 'Turn on one LED (0-4)'),
  stmt('mb_unplot', 'unplot x %1 y %2', [num('X'), num('Y')], C.led, 'Turn off one LED'),
  stmt('mb_toggle', 'toggle x %1 y %2', [num('X'), num('Y')], C.led, 'Flip one LED'),
  val('mb_point', 'point x %1 y %2', [num('X'), num('Y')], C.led, 'Boolean', 'True if the LED is on'),
  stmt('mb_bargraph', 'plot bar graph of %1 up to %2', [num('V'), num('HI')], C.led, 'Show a value as a bar graph'),

  hat('radio_on_number', 'on radio received receivedNumber', [], C.radio, 'Runs when a number arrives from another micro:bit in the same group'),
  hat('radio_on_string', 'on radio received receivedString', [], C.radio, 'Runs when text arrives from another micro:bit in the same group'),
  hat('radio_on_value', 'on radio received name value', [], C.radio, 'Runs when a name and value arrive from another micro:bit'),
  val('radio_number', 'receivedNumber', [], C.radio, 'Number', 'The number that arrived. Use inside “on radio received receivedNumber”.'),
  val('radio_string', 'receivedString', [], C.radio, 'String', 'The text that arrived. Use inside “on radio received receivedString”.'),
  val('radio_name', 'name', [], C.radio, 'String', 'The name that arrived. Use inside “on radio received name value”.'),
  val('radio_value', 'value', [], C.radio, 'Number', 'The value that arrived. Use inside “on radio received name value”.'),
  stmt('radio_send_number', 'radio send number %1', [num('NUM')], C.radio, 'Send a number to every micro:bit in the same group'),
  stmt('radio_send_string', 'radio send string %1', [{ type: 'input_value', name: 'TEXT', check: 'String' }], C.radio, 'Send up to 19 characters of text'),
  stmt('radio_send_value', 'radio send value %1 = %2', [txt('NAME', 'name'), num('NUM')], C.radio, 'Send a name (up to 8 letters) and a number'),
  stmt('radio_set_group', 'radio set group %1', [num('GROUP')], C.radio, 'Only micro:bits in the same group (0-255) hear each other'),

  hat('mb_every', 'every %1 ms', [{ type: 'field_number', name: 'MS', value: 500, min: 1 }], C.loops, 'Runs the code over and over, with a gap between'),

  stmt('serial_line', 'serial write line %1', [{ type: 'input_value', name: 'TEXT', check: 'String' }], C.serial, 'Print a line in the Data panel'),
  stmt('serial_value', 'serial write value %1 = %2', [txt('NAME', 'x'), num('NUM')], C.serial, 'Print a named number. The Data panel graphs it.'),
  stmt('serial_number', 'serial write number %1', [num('NUM')], C.serial, 'Print a number in the Data panel'),

  stmt('cb_motors', 'set left wheel speed %1 %% right wheel speed %2 %%', [num('L'), num('R')], C.cute, 'Motor power from -100 to 100. Negative drives backwards. The motors are not checked by the encoders.'),
  stmt('cb_forward', 'go forward at full speed', [], C.cute, 'Both wheels at 100%'),
  stmt('cb_back', 'go reverse at full speed', [], C.cute, 'Both wheels at -100%'),
  stmt('cb_stop', 'set %1 to stop immediately', [dd('WHEEL', motorOpts)], C.cute, 'Stop one wheel or both'),
  val('cb_speed', 'get speed of %1 %2', [dd('WHEEL', motor1Opts), dd('UNIT', speedUnitOpts)], C.cute, 'Number', 'How fast the wheel turns, measured by its encoder'),
  val('cb_degrees', 'get rotation degrees of %1', [dd('WHEEL', motor1Opts)], C.cute, 'Number', 'How far the wheel has turned, in degrees, since it was last cleared. 360 = one full turn.'),
  stmt('cb_clear_deg', 'clear rotation degrees of %1', [dd('WHEEL', motor1Opts)], C.cute, 'Set the wheel’s rotation degrees back to 0'),
  stmt('cb_headlights', 'set LED headlights %1 color to %2', [dd('LIGHT', lightOpts), { type: 'input_value', name: 'COLOR', check: 'Number' }], C.cute, 'Light the RGB headlights'),
  stmt('cb_headlights_rgb', 'set LED headlights %1 color to R: %2 G: %3 B: %4', [dd('LIGHT', lightOpts), num('R'), num('G'), num('B')], C.cute, 'Red, green and blue from 0 to 255'),
  stmt('cb_lights_off', 'turn off all LED headlights', [], C.cute, 'Headlights off'),
  val('cb_color', '%1', [dd('C', L.COLORS)], C.cute, 'Number', 'A color'),
  stmt('cb_track_read', 'get a tracking sensor state value', [], C.cute, 'Read all 4 line sensors now. The tracking sensor state and channel blocks use this reading, so put this block first.'),
  val('cb_tracking', 'tracking sensor state is %1', [dd('STATE', L.TRACK_STATES.map(t => [t[0], t[1]]))], C.cute, 'Boolean', 'Channels 1 to 4, left to right. ● means that sensor sees the black line. Uses the last “get a tracking sensor state value”.'),
  val('cb_track_ch', 'channel %1 tracking sensor %2', [dd('CH', chanOpts), dd('STATE', [['●', 'State_1'], ['◌', 'State_0']])], C.cute, 'Boolean', '● = this channel sees the black line. Channel 1 is on the left. Uses the last “get a tracking sensor state value”.'),
  val('cb_track_gray', 'channel %1 tracking sensor gray value', [dd('CH', chanOpts)], C.cute, 'Number', 'How bright the floor is under one sensor, 0 to 255. Low over the black line.'),
  val('cb_offset', 'fused offset value', [], C.cute, 'Number', 'Where the line is under the robot, from -3000 (far left) through 0 (middle) to 3000 (far right).'),
  val('cb_sonar', 'sonar sensor unit %1', [dd('UNIT', [['cm', 'Centimeters'], ['inches', 'Inches']])], C.cute, 'Number', 'Distance to the nearest object in front. 0 means nothing was heard.'),
  stmt('cb_cruise', 'set left wheel speed %1 right wheel speed %2 %3', [num('L'), num('R'), dd('UNIT', speedUnitOpts)], C.cute, 'Encoder-controlled speed, 20 to 50 cm/s. The robot keeps both wheels at exactly these speeds.'),
  stmt('cb_distance', 'go %1 %2 %3', [dd('DIR', dirOpts), num('DIST'), dd('UNIT', distUnitOpts)], C.cute, 'Drive an exact distance using the encoders, then stop. Waits until the move is done.'),
  stmt('cb_distance_speed', 'go %1 %2 %3 %4 %5', [num('SPEED'), dd('SUNIT', speedUnitOpts), dd('DIR', dirOpts), num('DIST'), dd('UNIT', distUnitOpts)], C.cute, 'Drive an exact distance at a speed from 20 to 50 cm/s. Waits until the move is done.'),
  stmt('cb_wheel_angle', 'set %1 rotation %2 %3', [dd('WHEEL', wheelOpts), num('ANGLE'), dd('UNIT', [['angle', 'Angle'], ['circle', 'Circle']])], C.cute, 'Turn a wheel by an exact number of degrees or full circles. Waits until the move is done.'),
  stmt('cb_turn', 'set car %1 for angle %2', [dd('TURN', turnOpts), num('ANGLE')], C.cute, 'Turn the robot by an exact angle. “At place” spins on the spot; otherwise one wheel stays still. Waits until the turn is done.'),
  stmt('cb_turn_speed', 'set car speed %1 %% and %2 for angle %3', [num('SPEED'), dd('TURN', turnOpts), num('ANGLE')], C.cute, 'Turn by an exact angle at a speed from 0 to 100%. Waits until the turn is done.'),
  stmt('cb_set_square', 'set length of the squares as %1 %2', [num('LEN'), dd('UNIT', distUnitOpts)], C.cute, 'How long one square is, for “go forward … squares”'),
  stmt('cb_squares', 'go forward %1 squares', [num('N')], C.cute, 'Drive forward a number of squares. Set the square length first.'),
  hat('cb_ir_on', 'on IR receiving', [], C.cute, 'Runs when the robot receives a button press from the IR remote'),
  val('cb_ir_button', 'IR button %1 is pressed', [dd('BTN', irOpts)], C.cute, 'Boolean', 'True while that remote button is held'),
  stmt('cb_servo', 'set %1 servo %2 angle to %3 °', [dd('TYPE', [['180°', 'Servo180'], ['270°', 'Servo270'], ['360°', 'Servo360']]), dd('SERVO', servoOpts), num('ANGLE')], C.cute, 'Turn a servo on an expansion port to an angle'),
  stmt('cb_cservo', 'set continuous servo %1 speed to %2 %%', [dd('SERVO', servoOpts), num('SPEED')], C.cute, 'Spin a continuous servo, -100 to 100%'),
  stmt('cb_ext_motor', 'set motor speed to %1 %%', [num('SPEED')], C.cute, 'A motor on the expansion port, -100 to 100%'),
  stmt('cb_ext_stop', 'stop motor', [], C.cute, 'Stop the expansion port motor')
];
Blockly.common.defineBlocksWithJsonArray(L.BLOCKS);

/* ---------- generator: one generator, two modes ----------
   simulator mode: async/await + block highlighting so the simulator can pause
   MakeCode mode: plain MakeCode TypeScript to paste into makecode.microbit.org */
const G = javascript.javascriptGenerator, O = javascript.Order;
G.INDENT = '    ';
G.addReservedWords(L.API_NAMES.join(',') + ',pins,control,Math,receivedNumber,receivedString,name,value');
let TS = false;
const AW = () => TS ? '' : 'await ';
const FN = (params = '') => (TS ? 'function (' : 'async function (') + params + ')';
const V = (b, n, d = '0') => G.valueToCode(b, n, O.NONE) || d;
const F = (b, n) => b.getFieldValue(n);
const def = (type, fn) => { G.forBlock[type] = fn; };
const beat = (b) => `music.beat(BeatFraction.${F(b, 'BEAT')})`;
const call = (code) => [code, O.FUNCTION_CALL];

def('mb_show_number', b => `${AW()}basic.showNumber(${V(b, 'NUM')})\n`);
def('mb_show_leds', b => { const v = F(b, 'LEDS'); let rows = ''; for (let y = 0; y < 5; y++) rows += '    ' + [0, 1, 2, 3, 4].map(x => v[y * 5 + x] === '1' ? '#' : '.').join(' ') + '\n'; return `${AW()}basic.showLeds(\`\n${rows}    \`)\n`; });
def('mb_show_icon', b => `${AW()}basic.showIcon(IconNames.${F(b, 'ICON')})\n`);
def('mb_show_string', b => `${AW()}basic.showString(${V(b, 'TEXT', '""')})\n`);
def('mb_clear', () => `basic.clearScreen()\n`);
def('mb_pause', b => `${AW()}basic.pause(${V(b, 'MS')})\n`);
def('mb_show_arrow', b => `${AW()}basic.showArrow(ArrowNames.${F(b, 'DIR')})\n`);
def('mb_button_pressed', b => call(`input.buttonIsPressed(Button.${F(b, 'BTN')})`));
def('mb_acceleration', b => call(`input.acceleration(Dimension.${F(b, 'DIM')})`));
def('mb_temperature', () => call('input.temperature()'));
def('mb_light', () => call('input.lightLevel()'));
def('mb_compass', () => call('input.compassHeading()'));
def('mb_running_time', () => call('input.runningTime()'));
def('mb_sound_level', () => call('input.soundLevel()'));
def('mb_sound_threshold', b => `input.setSoundThreshold(SoundThreshold.${F(b, 'S')}, ${V(b, 'V', '128')})\n`);
def('mb_play_tone', b => `${AW()}music.playTone(Note.${F(b, 'NOTE')}, ${beat(b)})\n`);
def('mb_ring_tone', b => `music.ringTone(Note.${F(b, 'NOTE')})\n`);
def('mb_rest', b => `${AW()}music.rest(${beat(b)})\n`);
def('mb_tempo', b => `music.setTempo(${V(b, 'BPM', '120')})\n`);
def('mb_stop_sounds', () => `music.stopAllSounds()\n`);
def('mb_plot', b => `led.plot(${V(b, 'X')}, ${V(b, 'Y')})\n`);
def('mb_unplot', b => `led.unplot(${V(b, 'X')}, ${V(b, 'Y')})\n`);
def('mb_toggle', b => `led.toggle(${V(b, 'X')}, ${V(b, 'Y')})\n`);
def('mb_point', b => call(`led.point(${V(b, 'X')}, ${V(b, 'Y')})`));
def('mb_bargraph', b => `led.plotBarGraph(${V(b, 'V')}, ${V(b, 'HI', '255')})\n`);
def('radio_number', () => ['receivedNumber', O.ATOMIC]);
def('radio_string', () => ['receivedString', O.ATOMIC]);
def('radio_name', () => ['name', O.ATOMIC]);
def('radio_value', () => ['value', O.ATOMIC]);
def('radio_send_number', b => `radio.sendNumber(${V(b, 'NUM')})\n`);
def('radio_send_string', b => `radio.sendString(${V(b, 'TEXT', '""')})\n`);
def('radio_send_value', b => `radio.sendValue(${JSON.stringify(F(b, 'NAME'))}, ${V(b, 'NUM')})\n`);
def('radio_set_group', b => `radio.setGroup(${V(b, 'GROUP', '1')})\n`);
def('serial_line', b => `serial.writeLine(${V(b, 'TEXT', '""')})\n`);
def('serial_value', b => `serial.writeValue(${JSON.stringify(F(b, 'NAME'))}, ${V(b, 'NUM')})\n`);
def('serial_number', b => `serial.writeNumber(${V(b, 'NUM')})\n`);
def('cb_motors', b => `CutebotPro.pwmCruiseControl(${V(b, 'L')}, ${V(b, 'R')})\n`);
def('cb_forward', () => `CutebotPro.fullSpeedAhead()\n`);
def('cb_back', () => `CutebotPro.fullAstern()\n`);
def('cb_stop', b => `CutebotPro.stopImmediately(CutebotProMotors.${F(b, 'WHEEL')})\n`);
def('cb_speed', b => call(`CutebotPro.readSpeed(CutebotProMotors1.${F(b, 'WHEEL')}, CutebotProSpeedUnits.${F(b, 'UNIT')})`));
def('cb_degrees', b => call(`CutebotPro.readDistance(CutebotProMotors1.${F(b, 'WHEEL')})`));
def('cb_clear_deg', b => `CutebotPro.clearWheelTurn(CutebotProMotors1.${F(b, 'WHEEL')})\n`);
def('cb_headlights', b => `CutebotPro.colorLight(CutebotProRGBLight.${F(b, 'LIGHT')}, ${V(b, 'COLOR', '0xff0000')})\n`);
def('cb_headlights_rgb', b => `CutebotPro.singleHeadlights(CutebotProRGBLight.${F(b, 'LIGHT')}, ${V(b, 'R')}, ${V(b, 'G')}, ${V(b, 'B')})\n`);
def('cb_lights_off', () => `CutebotPro.turnOffAllHeadlights()\n`);
def('cb_color', b => [F(b, 'C'), O.ATOMIC]);
def('cb_track_read', () => `CutebotPro.trackbitStateValue()\n`);
def('cb_tracking', b => call(`CutebotPro.getGrayscaleSensorState(TrackbitStateType.${F(b, 'STATE')})`));
def('cb_track_ch', b => call(`CutebotPro.trackbitChannelState(TrackbitChannel.${F(b, 'CH')}, TrackbitType.${F(b, 'STATE')})`));
def('cb_track_gray', b => call(`CutebotPro.trackbitgetGray(TrackbitChannel.${F(b, 'CH')})`));
def('cb_offset', () => call(`CutebotPro.getOffset()`));
def('cb_sonar', b => call(`CutebotPro.ultrasonic(SonarUnit.${F(b, 'UNIT')})`));
def('cb_cruise', b => `CutebotPro.cruiseControl(${V(b, 'L', '20')}, ${V(b, 'R', '20')}, CutebotProSpeedUnits.${F(b, 'UNIT')})\n`);
def('cb_distance', b => `${AW()}CutebotPro.distanceRunning(CutebotProOrientation.${F(b, 'DIR')}, ${V(b, 'DIST')}, CutebotProDistanceUnits.${F(b, 'UNIT')})\n`);
def('cb_distance_speed', b => `${AW()}CutebotPro.distanceSpeedRunning(${V(b, 'SPEED', '25')}, CutebotProSpeedUnits.${F(b, 'SUNIT')}, CutebotProOrientation.${F(b, 'DIR')}, ${V(b, 'DIST')}, CutebotProDistanceUnits.${F(b, 'UNIT')})\n`);
def('cb_wheel_angle', b => `${AW()}CutebotPro.angleRunning(CutebotProWheel.${F(b, 'WHEEL')}, ${V(b, 'ANGLE')}, CutebotProAngleUnits.${F(b, 'UNIT')})\n`);
def('cb_turn', b => `${AW()}CutebotPro.trolleySteering(CutebotProTurn.${F(b, 'TURN')}, ${V(b, 'ANGLE', '90')})\n`);
def('cb_turn_speed', b => `${AW()}CutebotPro.trolleySpeedSteering(${V(b, 'SPEED', '50')}, CutebotProTurn.${F(b, 'TURN')}, ${V(b, 'ANGLE', '90')})\n`);
def('cb_set_square', b => `CutebotPro.setBlockCnt(${V(b, 'LEN')}, CutebotProDistanceUnits.${F(b, 'UNIT')})\n`);
def('cb_squares', b => `${AW()}CutebotPro.runBlockCnt(${V(b, 'N')})\n`);
def('cb_ir_button', b => call(`CutebotPro.irButton(CutbotProIRButtons.${F(b, 'BTN')})`));
def('cb_servo', b => `CutebotPro.extendServoControl(ServoType.${F(b, 'TYPE')}, CutebotProServoIndex.${F(b, 'SERVO')}, ${V(b, 'ANGLE', '90')})\n`);
def('cb_cservo', b => `CutebotPro.continuousServoControl(CutebotProServoIndex.${F(b, 'SERVO')}, ${V(b, 'SPEED')})\n`);
def('cb_ext_motor', b => `CutebotPro.extendMotorControl(${V(b, 'SPEED')})\n`);
def('cb_ext_stop', () => `CutebotPro.extendMotorStop()\n`);
// MakeCode-flavoured versions of Blockly built-ins
def('math_random_int', b => call(`randint(${V(b, 'FROM')}, ${V(b, 'TO')})`));
def('text', b => [JSON.stringify(F(b, 'TEXT')), O.ATOMIC]);
def('text_join', b => { const parts = ['""']; for (let i = 0; i < b.itemCount_; i++) parts.push(G.valueToCode(b, 'ADD' + i, O.ADDITION) || '""'); return [parts.join(' + '), O.ADDITION]; });
def('math_change', b => `${G.getVariableName(F(b, 'VAR'))} += ${G.valueToCode(b, 'DELTA', O.ADDITION) || '0'}\n`);
const origCall = G.forBlock.procedures_callnoreturn, origCallR = G.forBlock.procedures_callreturn;
def('procedures_callnoreturn', function (b, g) { const c = origCall.call(this, b, g); return TS ? c : 'await ' + c; });
def('procedures_callreturn', function (b, g) { const [c] = origCallR.call(this, b, g); return TS ? [c, O.FUNCTION_CALL] : ['(await ' + c + ')', O.ATOMIC]; });

const STRINGY = new Set(['text', 'text_join', 'radio_string', 'radio_name']);
function valueType(t) {
  if (!t) return 'number';
  const chk = t.outputConnection && t.outputConnection.getCheck();
  if (chk && chk.includes('String')) return 'string';
  if (chk && chk.includes('Boolean')) return 'boolean';
  if (STRINGY.has(t.type)) return 'string';
  if (/^logic_(compare|operation|negate|boolean)$/.test(t.type)) return 'boolean';
  return 'number';
}
const INIT = { number: '0', string: '""', boolean: 'false' };
L.hasStatementCode = (ws) => ws.getTopBlocks(false).some(b => b.isEnabled() && HATS.has(b.type) && (b.getInputTargetBlock('DO') || b.type.startsWith('procedures_')));

/** Generate code for one workspace. ts=true gives MakeCode TypeScript; false gives simulator JavaScript. */
L.generate = function (ws, ts) {
  TS = ts;
  G.INFINITE_LOOP_TRAP = ts ? null : 'await __tick();\n';
  G.STATEMENT_PREFIX = ts ? null : 'await __hl(%1);\n';
  G.init(ws);
  const body = (b) => G.statementToCode(b, 'DO');
  const events = [], start = [], forevers = [];
  for (const b of ws.getTopBlocks(true)) {
    if (!b.isEnabled()) continue;
    switch (b.type) {
      case 'mb_on_start': start.push(body(b).replace(/^ {4}/gm, '')); break;
      case 'mb_forever': forevers.push(`basic.forever(${FN()} {\n${body(b)}})\n`); break;
      case 'mb_every': forevers.push(`loops.everyInterval(${F(b, 'MS')}, ${FN()} {\n${body(b)}})\n`); break;
      case 'mb_on_button': events.push(`input.onButtonPressed(Button.${F(b, 'BTN')}, ${FN()} {\n${body(b)}})\n`); break;
      case 'mb_on_gesture': events.push(`input.onGesture(Gesture.${F(b, 'G')}, ${FN()} {\n${body(b)}})\n`); break;
      case 'mb_on_sound': events.push(`input.onSound(DetectedSound.${F(b, 'S')}, ${FN()} {\n${body(b)}})\n`); break;
      case 'cb_ir_on': events.push(`CutebotPro.irCallback(${FN()} {\n${body(b)}})\n`); break;
      case 'radio_on_number': events.push(`radio.onReceivedNumber(${FN('receivedNumber')} {\n${body(b)}})\n`); break;
      case 'radio_on_string': events.push(`radio.onReceivedString(${FN('receivedString')} {\n${body(b)}})\n`); break;
      case 'radio_on_value': events.push(`radio.onReceivedValue(${FN('name, value')} {\n${body(b)}})\n`); break;
      case 'procedures_defnoreturn': case 'procedures_defreturn': G.blockToCode(b); break;
    }
  }
  // MakeCode declares variables first, then event handlers, then "on start" code, then forever loops
  const types = {};
  for (const b of ws.getAllBlocks(false)) {
    if (b.type !== 'variables_set') continue;
    const n = G.getVariableName(F(b, 'VAR'));
    if (!types[n]) types[n] = valueType(b.getInputTargetBlock('VALUE'));
  }
  let code = G.finish([...events, ...start, ...forevers].join(''));
  const procs = Blockly.Procedures.allProcedures(ws).flat().map(p => G.getProcedureName(p[0]));
  if (ts) {
    code = code.replace(/^var (.+);$/m, (m, names) => names.split(', ').map(n => `let ${n} = ${INIT[types[n] || 'number']}`).join('\n'))
      .replace(/\bvar\b/g, 'let')
      .replace(/;$/gm, '');
    for (const p of procs) code = code.replace(new RegExp('^function ' + p + '\\(([^)]*)\\) \\{$', 'm'), (m, ps) => `function ${p}(${ps.split(', ').filter(Boolean).map(x => x + ': number').join(', ')}) {`);
  } else {
    for (const p of procs) code = code.replace(new RegExp('^function ' + p + '\\(([^)]*)\\) \\{$', 'm'), `async function ${p}($1) {\n    await __tick();`);
  }
  TS = false;
  G.STATEMENT_PREFIX = null;
  return code.trim() + '\n';
};
/** A throw-away workspace holding a saved program, for generating or checking a program that is not on screen. */
L.headless = (state) => { const w = new Blockly.Workspace(); if (state) Blockly.serialization.workspaces.load(state, w); return w; };

/** Grey out blocks that are not inside an event, and reporters used outside their event. */
L.updateOrphans = function (ws) {
  Blockly.Events.disable();
  try {
    for (const b of ws.getAllBlocks(false)) {
      const root = b.getRootBlock();
      const orphan = !HATS.has(root.type);
      if (orphan !== b.hasDisabledReason('orphan')) b.setDisabledReason(orphan, 'orphan');
      const need = WHERE[b.type];
      if (need) {
        let p = b, ok = false; while (p) { if (p.type === need) { ok = true; break; } p = p.getSurroundParent(); }
        if (!ok && !orphan && !b.isInFlyout) { b.setWarningText(`Put this inside “${HAT_LABEL[need]}”.`); }
        else b.setWarningText(null);
        if ((!ok && !orphan) !== b.hasDisabledReason('wrongplace')) b.setDisabledReason(!ok && !orphan, 'wrongplace');
      }
    }
  } finally { Blockly.Events.enable(); }
};

/* ---------- toolbox ---------- */
const sh = (v) => ({ shadow: { type: 'math_number', fields: { NUM: v } } });
const shText = (t) => ({ shadow: { type: 'text', fields: { TEXT: t } } });
L.makeToolbox = function (devId) {
  const cats = [
    { kind: 'category', name: 'Basic', colour: C.basic, contents: [
      { kind: 'block', type: 'mb_show_number', inputs: { NUM: sh(0) } },
      { kind: 'block', type: 'mb_show_leds', fields: { LEDS: '0000001010000001000101110' } },
      { kind: 'block', type: 'mb_show_icon' },
      { kind: 'block', type: 'mb_show_string', inputs: { TEXT: shText('Hello!') } },
      { kind: 'block', type: 'mb_on_start' }, { kind: 'block', type: 'mb_forever' },
      { kind: 'block', type: 'mb_pause', inputs: { MS: sh(100) } },
      { kind: 'block', type: 'mb_clear' }, { kind: 'block', type: 'mb_show_arrow' } ] },
    { kind: 'category', name: 'Input', colour: C.input, contents: [
      { kind: 'block', type: 'mb_on_button' }, { kind: 'block', type: 'mb_on_gesture' }, { kind: 'block', type: 'mb_button_pressed' },
      { kind: 'block', type: 'mb_acceleration' }, { kind: 'block', type: 'mb_temperature' }, { kind: 'block', type: 'mb_light' },
      { kind: 'block', type: 'mb_compass' }, { kind: 'block', type: 'mb_running_time' },
      { kind: 'label', text: 'Microphone (micro:bit V2)' },
      { kind: 'block', type: 'mb_on_sound' }, { kind: 'block', type: 'mb_sound_level' },
      { kind: 'block', type: 'mb_sound_threshold', inputs: { V: sh(150) } } ] },
    { kind: 'category', name: 'Cutebot Pro', colour: C.cute, contents: [
      { kind: 'label', text: 'Basic control' },
      { kind: 'block', type: 'cb_forward' }, { kind: 'block', type: 'cb_back' },
      { kind: 'block', type: 'cb_motors', inputs: { L: sh(50), R: sh(50) } },
      { kind: 'block', type: 'cb_stop' },
      { kind: 'block', type: 'cb_speed' }, { kind: 'block', type: 'cb_degrees' }, { kind: 'block', type: 'cb_clear_deg' },
      { kind: 'label', text: 'PID control (encoders)' },
      { kind: 'block', type: 'cb_cruise', inputs: { L: sh(25), R: sh(25) } },
      { kind: 'block', type: 'cb_distance', inputs: { DIST: sh(20) } },
      { kind: 'block', type: 'cb_turn', inputs: { ANGLE: sh(90) } },
      { kind: 'block', type: 'cb_wheel_angle', inputs: { ANGLE: sh(360) } },
      { kind: 'block', type: 'cb_set_square', inputs: { LEN: sh(10) } },
      { kind: 'block', type: 'cb_squares', inputs: { N: sh(1) } },
      { kind: 'block', type: 'cb_distance_speed', inputs: { SPEED: sh(25), DIST: sh(20) } },
      { kind: 'block', type: 'cb_turn_speed', inputs: { SPEED: sh(50), ANGLE: sh(90) } },
      { kind: 'label', text: 'LED headlights' },
      { kind: 'block', type: 'cb_headlights', inputs: { COLOR: { shadow: { type: 'cb_color', fields: { C: '0xff0000' } } } } },
      { kind: 'block', type: 'cb_headlights_rgb', inputs: { R: sh(255), G: sh(255), B: sh(255) } },
      { kind: 'block', type: 'cb_lights_off' },
      { kind: 'label', text: 'Tracking sensor (4 channels)' },
      { kind: 'block', type: 'cb_track_read' }, { kind: 'block', type: 'cb_tracking' }, { kind: 'block', type: 'cb_track_ch' },
      { kind: 'block', type: 'cb_track_gray' }, { kind: 'block', type: 'cb_offset' },
      { kind: 'label', text: 'Sonar sensor' },
      { kind: 'block', type: 'cb_sonar' },
      { kind: 'label', text: 'Infrared sensor' },
      { kind: 'block', type: 'cb_ir_on' }, { kind: 'block', type: 'cb_ir_button' },
      { kind: 'label', text: 'Expansion port' },
      { kind: 'block', type: 'cb_servo', inputs: { ANGLE: sh(90) } }, { kind: 'block', type: 'cb_cservo', inputs: { SPEED: sh(50) } },
      { kind: 'block', type: 'cb_ext_motor', inputs: { SPEED: sh(50) } }, { kind: 'block', type: 'cb_ext_stop' } ] },
    { kind: 'category', name: 'Radio', colour: C.radio, contents: [
      { kind: 'block', type: 'radio_set_group', inputs: { GROUP: sh(1) } },
      { kind: 'block', type: 'radio_send_number', inputs: { NUM: sh(0) } },
      { kind: 'block', type: 'radio_send_string', inputs: { TEXT: shText('go') } },
      { kind: 'block', type: 'radio_send_value', inputs: { NUM: sh(0) } },
      { kind: 'block', type: 'radio_on_number' }, { kind: 'block', type: 'radio_number' },
      { kind: 'block', type: 'radio_on_string' }, { kind: 'block', type: 'radio_string' },
      { kind: 'block', type: 'radio_on_value' }, { kind: 'block', type: 'radio_name' }, { kind: 'block', type: 'radio_value' } ] },
    { kind: 'category', name: 'Music', colour: C.music, contents: [
      { kind: 'block', type: 'mb_play_tone' }, { kind: 'block', type: 'mb_ring_tone' }, { kind: 'block', type: 'mb_rest' },
      { kind: 'block', type: 'mb_tempo', inputs: { BPM: sh(120) } }, { kind: 'block', type: 'mb_stop_sounds' } ] },
    { kind: 'category', name: 'Led', colour: C.led, contents: [
      { kind: 'block', type: 'mb_plot', inputs: { X: sh(0), Y: sh(0) } }, { kind: 'block', type: 'mb_unplot', inputs: { X: sh(0), Y: sh(0) } },
      { kind: 'block', type: 'mb_toggle', inputs: { X: sh(0), Y: sh(0) } }, { kind: 'block', type: 'mb_point', inputs: { X: sh(0), Y: sh(0) } },
      { kind: 'block', type: 'mb_bargraph', inputs: { V: sh(0), HI: sh(255) } } ] },
    { kind: 'category', name: 'Loops', colour: C.loops, contents: [
      { kind: 'block', type: 'controls_repeat_ext', inputs: { TIMES: sh(4) } },
      { kind: 'block', type: 'controls_whileUntil', inputs: { BOOL: { shadow: { type: 'logic_boolean', fields: { BOOL: 'TRUE' } } } } },
      { kind: 'block', type: 'controls_for', fields: { VAR: { name: 'index' } }, inputs: { FROM: sh(0), TO: sh(4), BY: sh(1) } },
      { kind: 'block', type: 'mb_every' }, { kind: 'block', type: 'controls_flow_statements' } ] },
    { kind: 'category', name: 'Logic', colour: C.logic, contents: [
      { kind: 'block', type: 'controls_if' }, { kind: 'block', type: 'controls_if', extraState: { hasElse: true } },
      { kind: 'block', type: 'logic_compare', inputs: { A: sh(0), B: sh(0) } },
      { kind: 'block', type: 'logic_compare', fields: { OP: 'LT' }, inputs: { A: sh(0), B: sh(0) } },
      { kind: 'block', type: 'logic_operation' }, { kind: 'block', type: 'logic_operation', fields: { OP: 'OR' } },
      { kind: 'block', type: 'logic_negate' }, { kind: 'block', type: 'logic_boolean' } ] },
    { kind: 'category', name: 'Variables', colour: C.vars, custom: 'VARIABLE' },
    { kind: 'category', name: 'Math', colour: C.math, contents: [
      { kind: 'block', type: 'math_number' },
      { kind: 'block', type: 'math_arithmetic', inputs: { A: sh(0), B: sh(0) } },
      { kind: 'block', type: 'math_arithmetic', fields: { OP: 'MINUS' }, inputs: { A: sh(0), B: sh(0) } },
      { kind: 'block', type: 'math_arithmetic', fields: { OP: 'MULTIPLY' }, inputs: { A: sh(0), B: sh(0) } },
      { kind: 'block', type: 'math_random_int', inputs: { FROM: sh(0), TO: sh(10) } },
      { kind: 'block', type: 'math_modulo', inputs: { DIVIDEND: sh(0), DIVISOR: sh(1) } },
      { kind: 'block', type: 'math_single', fields: { OP: 'ABS' }, inputs: { NUM: sh(0) } },
      { kind: 'block', type: 'math_round', inputs: { NUM: sh(0) } },
      { kind: 'block', type: 'math_constrain', inputs: { VALUE: sh(0), LOW: sh(0), HIGH: sh(100) } } ] },
    { kind: 'category', name: 'Functions', colour: C.fn, custom: 'PROCEDURE' },
    { kind: 'category', name: 'Text', colour: C.text, contents: [
      { kind: 'block', type: 'text' }, { kind: 'block', type: 'text_join' }, { kind: 'block', type: 'text_length', inputs: { VALUE: shText('Hello') } } ] },
    { kind: 'category', name: 'Serial', colour: C.serial, contents: [
      { kind: 'block', type: 'serial_value', inputs: { NUM: sh(0) } },
      { kind: 'block', type: 'serial_line', inputs: { TEXT: shText('Hello') } },
      { kind: 'block', type: 'serial_number', inputs: { NUM: sh(0) } } ] }
  ];
  return { kind: 'categoryToolbox', contents: devId === 'remote' ? cats.filter(c => c.name !== 'Cutebot Pro') : cats };
};

/* ---------- theme from page tokens ---------- */
const cssVar = L.cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
L.makeTheme = function () {
  return Blockly.Theme.defineTheme('cutebotpro-' + Math.random().toString(36).slice(2, 7), {
    base: Blockly.Themes.Classic,
    blockStyles: {
      logic_blocks: { colourPrimary: C.logic }, loop_blocks: { colourPrimary: C.loops }, math_blocks: { colourPrimary: C.math },
      text_blocks: { colourPrimary: C.text }, variable_blocks: { colourPrimary: C.vars }, variable_dynamic_blocks: { colourPrimary: C.vars },
      procedure_blocks: { colourPrimary: C.fn }, list_blocks: { colourPrimary: '#D83B01' }, colour_blocks: { colourPrimary: C.cute }
    },
    componentStyles: {
      workspaceBackgroundColour: cssVar('--panel-2'), toolboxBackgroundColour: cssVar('--panel'), toolboxForegroundColour: cssVar('--ink'),
      flyoutBackgroundColour: cssVar('--panel'), flyoutForegroundColour: cssVar('--muted'), flyoutOpacity: 0.97,
      scrollbarColour: cssVar('--line'), scrollbarOpacity: 0.9, insertionMarkerColour: cssVar('--ink'), insertionMarkerOpacity: 0.3
    },
    fontStyle: { family: 'Lexend, "Segoe UI", system-ui, sans-serif', weight: '500', size: 11 },
    startHats: false
  });
};
})();
