import { interval, fromEvent } from 'rxjs'
import { map, scan, filter, flatMap, takeUntil, repeat } from 'rxjs/operators'

function pong() {
    // Inside this function you will use the classes and functions 
    // from rx.js
    // to add visuals to the svg element in pong.html, animate them, and make them interactive.
    // Study and complete the tasks in observable exampels first to get ideas.
    // Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/ 
    // You will be marked on your functional programming style
    // as well as the functionality that you implement.
    // Document your code!  
  
  /*--------------------------INITIALIZATION OF SVG ELEMENTS---------------------------*/
  
  /*Audio files & idea of their usage were taken & inspired from: 
  https://thecodingpie.com/post/learn-to-code-ping-pong-game-using-javascript-and-html5/
  */

  //these audio files will play whether the player scores, or the ball collides with a wall or paddle.
  const 
    paddleHitSound = new Audio('hitSound.wav'),
    scoreSound = new Audio('scoreSound.wav'),
    wallHitSound = new Audio('wallHitSound.wav'),
    svg = document.getElementById("canvas")!,
    //an interface whose scores would be updated, scoreA indicates the user, scoreB indicates the AI.
    pongScores = {
      scoreA: 0,
      scoreB: 0,
      maxScore: 7
    };

  /*General structure (i.e. Object.entries({...}).forEach...) of creating SVG elements is inspired from:
  Monash University - FIT2102: Programming Paradigms S2 2020, Tutorial 5 (Observables)
  */

  /*The SVG elements for the player paddle, the AI paddle, the dotted divider line, 
    and the ball is created below.
    The SVG for the score and result display is created separately in the pong.html file.*/

  const leftPaddle = document.createElementNS(svg.namespaceURI,'rect')
  Object.entries({
    x:20, y:svg.getBoundingClientRect().height/2 - 45,
    width: 10, height: 90,
    fill: '#32CD32',
    stroke: '#FFFFFF',
    "stroke-width":3,
  }).forEach(([key,val])=>leftPaddle.setAttribute(key,String(val)))

  const rightPaddle = document.createElementNS(svg.namespaceURI,'rect')
  Object.entries({
    x: 770, y: svg.getBoundingClientRect().height/2 - 45,
    width: 10, height: 90,
    fill: '#00CCFF',
    stroke: '#FFFFFF',
    "stroke-width":3,
  }).forEach(([key,val])=> rightPaddle.setAttribute(key,String(val)))

  const divider = document.createElementNS(svg.namespaceURI, 'line')
  Object.entries({
    x1: svg.getBoundingClientRect().width/2, y1: 0,
    x2: svg.getBoundingClientRect().width/2, y2: svg.getBoundingClientRect().height,
    stroke:'#FFFFFF',
    "stroke-width":5,
    "stroke-dasharray":15,
  }).forEach(([key,val])=> divider.setAttribute(key,String(val)))

  const pongBall = document.createElementNS(svg.namespaceURI,'circle')
  Object.entries({
    cx: svg.getBoundingClientRect().width/2, 
    cy: svg.getBoundingClientRect().height/2, 
    r: 7,
    fill: '#FFBF00',
    speed: 6,
    xVelocity: 5,
    yVelocity: 0,
  }).forEach(([key,val])=> pongBall.setAttribute(key,String(val)))

  //each svg element initialized above is appended to the main "canvas" element
  svg.appendChild(leftPaddle);
  svg.appendChild(rightPaddle);
  svg.appendChild(divider);
  svg.appendChild(pongBall);
  
  /*------------------------TYPE DECLARATIONS AND SVG INITIAL STATES-------------------------------*/
  type paddleState = Readonly<{
      x: number,
      y: number,
      width: number,
      height: number,
  }>

  /*the "speed" field will be used to increase the ball movement speed whenever 
    there's an angle change when it collides with a paddle.*/
  type ballState = Readonly<{
    cx: number;
    cy: number;
    r: number;
    speed: number;
    xVelocity: number;
    yVelocity: number;
  }>
  
  //storing the start information of the player paddle, AI paddle, and ball as immutables
  const 
    leftInitialState: paddleState = {x: 20, y:svg.getBoundingClientRect().height/2 - 45 , width:10, height: 90},
    ballInitialState: ballState = {
    cx: svg.getBoundingClientRect().width/2, 
    cy: svg.getBoundingClientRect().height/2,
    r: 7, 
    speed: 6,
    xVelocity: 5,
    yVelocity: 0,
    },
    rightInitialState: paddleState = {x: 770, y: svg.getBoundingClientRect().height/2 - 45, width: 10, height: 90};

  
  /*-----------------------------FUNCTIONS FOR PLAYER PADDLE------------------------------------*/
  
  //playerMovement returns some state information regarding the player paddle based on certain criteria.
  function playerMovement(state: paddleState, units: number) : paddleState {
    const ballXCo = parseInt(pongBall.getAttribute('cx'));
    const ballRad = parseInt(pongBall.getAttribute('r'));
    
    //checking if the player paddle goes over the canvas's top & bottom boundaries
    if ((state.y+state.height) + units < svg.getBoundingClientRect().height && state.y + units > 0) {
      return {...state, y: state.y + units};
    }

    //checking whether the ball leaves the canvas's left and right boundaries, will reset position
    else if (ballXCo + ballRad < 0 || ballXCo - ballRad > svg.getBoundingClientRect().width) {
      return leftInitialState;
    }

    //otherwise, move as normal based on user input
    else {
      return {...state};
    }
  }

  //takes the state returned from playerMovement and updates the player paddle's x and y coordinates
  function updatePlayer(state: paddleState) : void {
    leftPaddle.setAttribute('x', `${state.x}`);
    leftPaddle.setAttribute('y', `${state.y}`) 
  }

  /*---------------------------FUNCTIONS FOR BALL MOVEMENT-------------------------------------*/

  //collisionPaddles returns true or false depending if the ball hits the player or AI paddle
  function collisionPaddles(user: Element, ball: ballState) : boolean {
    const
      //paddle dimensions
      paddleTop = parseInt(user.getAttribute('y')),
      paddleRight = parseInt(user.getAttribute('x')) + parseInt(user.getAttribute('width')),
      paddleBottom = parseInt(user.getAttribute('y')) + parseInt(user.getAttribute('height')),
      paddleLeft = parseInt(user.getAttribute('x')),

      //ball dimensions
      ballTop = ball.cy - ball.r,
      ballRight = ball.cx + ball.r,
      ballBottom = ball.cy + ball.r,
      ballLeft = ball.cx - ball.r

    return ((ballLeft < paddleRight) && (ballTop < paddleBottom) && (ballRight > paddleLeft) && (ballBottom > paddleTop));
  }

  //similar in function to the playerMovement function, but for the ball. 
  //has an added functionality of score tracking
  function ballMovement(state: ballState) : ballState {
    /*player: determines which paddle would be passed into collisionPaddles depending on which side 
              of the canvas the ball is on.
      scoreA & scoreB: would be increased depending on which x-boundary the ball leaves from.*/
    const 
      player = state.cx < svg.getBoundingClientRect().width/2 ? leftPaddle : rightPaddle,
      scoreA = document.getElementById("scoreA"),
      scoreB = document.getElementById("scoreB")
  
    //collision check with upper/lower booundaries
    if (state.cy + state.r >= svg.getBoundingClientRect().height || state.cy - state.r <= 0) {
      wallHitSound.play();
      return {...state, cx: state.cx + state.xVelocity, cy: state.cy - state.yVelocity, yVelocity: -state.yVelocity};
    }

    //collision with player/AI paddles
    else if (collisionPaddles(player, state)) {
      /*this local variable "angle" is used for the sake of reducing the required 
        lines of code for the calculations below*/
      let angle = 0;
    
      //angle for when the ball hits the top half of the paddle
      if (state.cy < (parseInt(player.getAttribute('y')) + parseInt(player.getAttribute('height'))/2)) {
        angle = -1*Math.PI/4;
      }
        
      //angle for when the ball hits the bottom half of the paddle
      else if (state.cy > (parseInt(player.getAttribute('y')) + parseInt(player.getAttribute('height'))/2)) {
        angle = Math.PI/4;   
      }
      
      /*calculting the new x and y velocities of the ball from the angle obtained above.
        there would be a direction change in the x-velocity depending on the paddle collided with*/
      const 
        newxVelocity = (player === leftPaddle ? 1 : -1) * state.speed * Math.cos(angle),
        newyVelocity = state.speed * Math.sin(angle),
        newSpeed = state.speed + 0.2
    
      paddleHitSound.play();
      return {...state, cx: state.cx + newxVelocity, cy: state.cy + newyVelocity, xVelocity: newxVelocity, yVelocity: newyVelocity, speed: newSpeed};			
    } 
    
    /*The two else if statements below check if the ball leaves the left or right canvas boundaries
      respectively, it would then increment the respective player's score and reset the ball's initial
      position.

      The scored function is declared further down.*/
    
    //checks if ball leaves left canvas boundary, AI scores a point
    else if (state.cx + state.r < 0) {
      pointObtained(pongScores.scoreA, ++pongScores.scoreB, pongScores.maxScore);
      scoreB.textContent = String(pongScores.scoreB);
      scoreSound.play();
      return ballInitialState;
    }

    //checks if ball leaves right canvas boundary, player scores a point
    else if (state.cx - state.r > svg.getBoundingClientRect().width) {
      pointObtained(++pongScores.scoreA, pongScores.scoreB, pongScores.maxScore)
      scoreA.textContent = String(pongScores.scoreA);
      scoreSound.play();
      return ballInitialState;
    }

    else {
      return {...state, cx: state.cx + state.xVelocity, cy: state.cy + state.yVelocity};
    } 
  } 

  //similar in function to updatePlayer, but for the ball instead
  function updateBall(state: ballState) : void {
    pongBall.setAttribute('cx', `${state.cx}`); 
    pongBall.setAttribute('cy', `${state.cy}`);
  }

  /*---------------------------FUNCTIONS FOR AI PADDLE MOVEMENT--------------------------------*/

  //similar in function to playerMovement, but for the AI paddle
  function AIMovement (state:paddleState): paddleState {
    const ballXCo = parseInt(pongBall.getAttribute('cx'));
    const ballRad = parseInt(pongBall.getAttribute('r'));

    //checking whether the ball "leaves" the canvas's left and right boundaries, will reset position
    if (ballXCo + ballRad < 0 || ballXCo - ballRad > svg.getBoundingClientRect().width) {
      return rightInitialState;
    }

    //the AI paddle's movement is based on the y-coordinate of the ball.
    //the 0.09 multiplied at the end slows down the AI paddle slightly so it doesn't follow the ball perfectly
    else {
      return {...state, y: state.y + ((parseInt(pongBall.getAttribute('cy')) - (state.y + state.height/2)))*0.09};
    }
  }

  //similar in function to updatePlayer, but for the AI instead
  function updateAI(state:paddleState): void {
    rightPaddle.setAttribute('x', `${state.x}`);
    rightPaddle.setAttribute('y', `${state.y}`) 
  }

/*---------------------------FUNCTION FOR DISPLAYING FINAL RESULT--------------------------------*/

  //displays the winner depending on whom gets the max score (7) first.
  function pointObtained(scoreA: number, scoreB: number, maxScore:number){
    const result = document.getElementById('result');
    
    if (pongScores.scoreA == pongScores.maxScore) {
      result.innerHTML = "&#127775 Player 1 is the Winner! &#127775";
    }
    else if (pongScores.scoreB == pongScores.maxScore) {
      result.innerHTML = "&#127941 Player 2 is the Winner! &#127941"; 
    }   
  }

/*--------------------------------THE OBSERVABLE STREAMS-----------------------------------------*/
  
  /*General Structure of the player paddle's observable is inspired from: 
  https://tgdwyer.github.io/asteroids/ */

  //observable for the player paddle, allows for up and down movement
  fromEvent<KeyboardEvent>(document, 'keydown')
  .pipe(
    filter(({code})=>code === 'KeyW' || code === 'ArrowUp' || code === 'KeyS' || code === 'ArrowDown'),
    filter(({repeat})=>!repeat),
    flatMap(d=>interval(10).pipe(
      takeUntil(fromEvent<KeyboardEvent>(document, 'keyup').pipe(
        filter(({code})=>code === d.code),
      )),
      map(_=>d))
    ),
    map(({code})=>code === 'KeyW' || code === 'ArrowUp'? -5:5),
    scan(playerMovement, leftInitialState))
    .subscribe(updatePlayer)

  //observable for the ball, it is unsubscribed when the max score is obtained.
  interval(10).pipe(
    takeUntil(interval(10).pipe(
      filter(_=>pongScores.scoreA === pongScores.maxScore || pongScores.scoreB === pongScores.maxScore)
    )),
    scan(ballMovement, ballInitialState), 
    ).subscribe(updateBall)

  //observable for the AI paddle, similar to the ball, it is unsubscribed when the max score is obtained
  interval(10).pipe(
    takeUntil(interval(10).pipe(
      filter(_=>pongScores.scoreA === pongScores.maxScore || pongScores.scoreB === pongScores.maxScore)
    )),
    scan(AIMovement, rightInitialState), 
    ).subscribe(updateAI)

  /*--------------------------------END OF PONG GAME CODE-----------------------------------------*/
}

// the following simply runs your pong function on window load.  Make sure to leave it in place.
if (typeof window != 'undefined')
  window.onload = ()=>{
    pong();
  }
 
  