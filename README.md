# Cutebot Pro Code Lab: Student Instructions

Cutebot Pro Code Lab is a website where you program a micro:bit with blocks and test your code on a virtual Cutebot Pro robot before you try it on a real one.

**Open the lab:** https://smitka313.github.io/CutebotProLab/

## Getting started

1. Open **https://smitka313.github.io/CutebotProLab/** in Microsoft Edge.
2. The first time, a short tour shows you around. Click **Next** to go through it. You can see it again any time from **Menu → Show the tour again**.
3. Your projects and challenge results are saved in Edge on that PC, under your Windows sign-in, not online. If you move to a different PC, or the PC clears its data when you sign out, your work won't be there next time, so download your project and turn in your file before you leave (see [Tips](#tips-and-fixing-problems)). Don't use an InPrivate window: everything you do there is deleted when you close it.

## The basics

The screen has two halves: the **arena** with the robot on the left, and your **blocks** on the right.

- **Build your program:** open a category on the left of the blocks area (for example **Cutebot Pro** or **Basic**) and drag blocks in. Blocks inside **on start** run once. Blocks inside **forever** repeat over and over. Blocks that aren't inside one of these are greyed out and don't run.
- **Find a block:** type a word like "sonar" or "turn" in the **Search blocks** box.
- **Fix mistakes:** use the **↶** and **↷** buttons to undo and redo. Drag a block to the **trash can** to delete it.
- **Test it:** press **Run** (or the space bar). Watch the robot in the arena. Press **Stop** to stop it and **Reset** to put the robot back at the start. To test long runs quickly, pick **Faster 4×** or **Fastest 8×** from the speed list.
- **Keyboard shortcuts:** **Space** runs and stops, **R** resets, **+** and **−** zoom the arena, **F** follows the robot.
- **Change the arena:** pick a different one from the list next to Reset, such as Line track or Obstacle room.
- **Learn step by step:** click **Lessons** at the top for guided activities. Start with "Hello, Cutebot Pro".
- **Your projects:** open **Menu → My projects** to switch between projects. Rename a project in the name box at the top of the page. Your work saves automatically.
- **Real-world mode** is off at first, so the robot is perfect. Switch it on to make the robot act more like a real one, with slightly uneven motors and noisy sensors.

The Cutebot Pro has two things the regular Cutebot doesn't:

- **Encoder (PID) blocks:** blocks like **go forward 20 cm** and **set car turn right at place for angle 90** measure how far the wheels turn, so the robot drives an exact distance or angle, even in Real-world mode. These blocks wait until the move is finished before the next block runs.
- **Four line sensors:** channels 1 to 4, from left to right. Always put **get a tracking sensor state value** first in **forever**. The other tracking sensor blocks use that reading, so without it they never change.

## Doing a challenge

There are 7 challenges, from Beginner to Advanced. Start with Square dance and work down the list.

1. Under the arena, click the **Challenges** tab.
2. Click **Start** next to a challenge. The arena changes, and a **Goal** card tells you what the robot has to do. If the goal covers the robot, click **Hide ▴** to fold it into a small **Goal ▾** tab.
3. Build your program, then press **Run**. The timer starts when you press Run. You can't move the robot by hand during the run.
4. If it doesn't work, a red **"Went wrong here"** mark shows where it went wrong. Change your program and press **Run** again.
5. Stuck? Click **Need a hint?** You can open up to three hints, one at a time.
6. When you pass, you'll see **Challenge passed!** Your proof is saved, and your best time is kept if you try again.
7. Click **Exit challenge** to go back to building freely.

| Order | Challenge | Level |
| --- | --- | --- |
| 1 | Square dance | Beginner |
| 2 | Park at the wall | Beginner |
| 3 | Reach the flag | Intermediate |
| 4 | Three laps | Intermediate |
| 5 | Survive the ring | Intermediate |
| 6 | Curvy lap | Advanced |
| 7 | Remote driver | Advanced |

To see what you've finished, open **Menu → My progress**.

## V2X missions

The lab has practice fields for the Square One V2X Senior Division tasks. Test your code here first, then on the real robot and field.

1. Open the **Challenges** tab and scroll to **V2X Senior missions 2026-27**, or pick a mission from the arena list.
2. Click **Start**. The goal card and the checklist under the timer show exactly what the robot must do.
3. Press **Run**. Each item turns green when the robot does it, and you get a practice score out of the rubric's points. Your best score is saved as proof, like a challenge.

| Mission | Due | Practice points |
| --- | --- | --- |
| Alpha: Roz's Depot Calibration | Video due Feb 19, 2027 | 10 |
| Bravo: Goose Flock Platooning | Video due Feb 26, 2027 | 10 |
| Charlie: Refuge Pull-Over | Video due Mar 5, 2027 | 10 |
| Delta: Winter Supply Delivery | Competition day | Points by cube color |
| Echo: RECO Bot Neutralization | Competition day | 55 |
| Foxtrot: Fragile Egg Escort | Competition day | 85 |
| Golf: Innovative Mobility Exhibition | Competition day (optional) | Not scored in the lab |

Good to know:

- **Practice scores are not your real score.** The judges score your videos and your runs on competition day, including any bonus points.
- **Charlie uses the micro:bit V2 microphone.** Find **on loud sound**, **sound level** and **set loud sound threshold** in **Input**. To test sounds outside the mission, use the **Room sound level** slider and **Make a loud sound** on the micro:bit tab.
- **Delta and Echo give your robot two arms** on servos S1 (left) and S2 (right). They start folded back at 0°; 90° sticks straight out.
- **Golf** has an open 4 × 8 ft space in the arena list. Use **Edit arena** to draw roads and add boxes for your idea.
- **The fields are measured in inches.** Grid squares are 6 in, and the sonar shows inches too. The big fields start zoomed in on the robot; press **−** to see the whole field. To use inches anywhere, tick **Options → Grid in inches**.
- **Watch the checklist.** An item turns red (✗) as soon as it can't be done any more, like touching the lead box in Bravo. In the last 10 seconds the clock turns red and beeps.
- **Practice first with the lessons** "Listen with the microphone" and "Servo arms". To use the arms outside a mission, tick **Options → Servo arms on S1 and S2**.
- **Write your own code.** The competition rules say students write all the code, so the lab has no mission answers. The hints give ideas, not programs.

## HuskyLens camera

Some teams add a DFRobot HuskyLens AI camera to find things by color. The lab has a virtual HuskyLens on the front of the robot. So far it does **Color Recognition** only.

1. Open the **HuskyLens** category and use the same blocks as MakeCode: **initialize I2C**, **switch algorithm to Color Recognition**, then in **forever** **request data once**, and read the result with blocks like **check if ID 1 frame is on screen** and **get X center of ID 1 frame**.
2. Open the **HuskyLens** tab under the arena to see what the camera sees. Frames are drawn like on the real screen (320 × 240 pixels: X goes left to right, Y top to bottom).
3. The lab starts with four learned colors: ID1 red, ID2 blue, ID3 yellow, ID4 green. To teach your own, put a colored object in the center box and press **Learn**.

On Delta, using color recognition earns the rubric's 5 points for a smart camera. For the real robot, also add the DFRobot **HuskyLens** extension in MakeCode, and teach colors with the camera's own button. Real cameras struggle with glare and dim light, so test on the real field.

## Turning in your work

You turn in one file that holds your project and proof of every challenge you passed and every mission you scored. A yellow number on the **Turn in** button shows how many passed challenges you haven't turned in yet.

**Step 1: Download your turn-in file**

1. Open the project you want to turn in.
2. Click **Turn in** at the top of the page.
3. Type your **first and last name** and your **class period**.
4. Tick the challenges and missions to include. All the ones you passed or scored are ticked already.
5. Click **Download turn-in file**. It saves to your **Downloads** folder with a name like `Jordan Lee - Line follower.cutebotpro.json`.

**Step 2: Upload it to Schoology**

1. In Schoology, open the Cutebot Pro assignment.
2. Click **Submit Assignment**, then choose **Upload**.
3. Pick the `.cutebotpro.json` file from your Downloads folder. Windows may hide the ending, so it can show as `Jordan Lee - Line follower.cutebotpro` with the type **JSON File**.
4. Click **Submit**.

Don't open or change the file before you upload it. Your teacher replays every challenge from the file to check it, and a changed file won't pass. If you pass more challenges later, download a new turn-in file and submit again.

## Tips and fixing problems

**Before you leave class, every time:**

1. Click **Menu → Save or open a file → Download this project** to save a backup copy of your project in your Downloads folder (or your OneDrive).
2. If you passed a challenge today, click **Turn in**, download the turn-in file, and submit it on Schoology. Keep the file: it's also your backup. On any PC, opening it brings back your project and your passed challenges.

- **My work is gone.** You're probably on a different PC, a different browser or Edge profile, or an InPrivate window. Go back to the PC you used before. If you can't, open your latest turn-in file with **Menu → Save or open a file → Open a project or turn-in file**. It brings back your project and your passed challenges. A project backup brings back the project only.
- **I deleted a project by mistake.** Open **Menu → My projects** and click **Restore** under Recently deleted. Deleted projects are kept for 7 days.
- **The robot doesn't move.** Check that your blocks are inside **on start** or **forever**. Greyed-out blocks don't run.
- **The line sensor blocks never change.** Put **get a tracking sensor state value** at the top of **forever**, before the blocks that check the sensors.
- **My program stopped with a red message.** Click **Show me the block** to find the block that caused it.
- **The Download button did nothing.** Edge shows downloads in a box at the top right. If it asks, choose Keep. The file is also in your Downloads folder. You can also click **Copy as text**, paste it into a new file, and save it with the `.cutebotpro.json` ending.
- **I need my code for a V2X submission.** The rules ask for your code as a PDF with each video. First add comments to your blocks (right-click a block, **Add Comment**). Then open **Menu → Code for judges**, fill in your team name, number and mission, and click **Print or save as PDF**. In the print window, choose **Save as PDF**.
- **I want to try it on a real Cutebot Pro.** Click **Send to real Cutebot Pro** and follow the steps to open your code in MakeCode with the Cutebot Pro extension.
- **The lab looks out of date.** Press **Ctrl+F5** to load the newest version.
