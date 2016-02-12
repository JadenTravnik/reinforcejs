    // Lineworld
    var Lineworld = function(){
      this.Rarr = null; // reward array
      this.reset()
    }
    Lineworld.prototype = {
      reset: function() {

        // hardcoding one gridworld for now
        this.cellHeight = 1;
        this.cellWidth = 7;


        this.startCell = Math.floor(this.cellWidth/2);

        this.numberOfCells = this.cellWidth; // number of states

        // specify some rewards
        var Rarr = R.zeros(this.numberOfCells);

        this.terminalIteration = 1;
        this.terminationState = -1;
        this.soundLocations = 2;
        this.soundTypes = 1;
        this.maxSoundDuration = 4;
        this.maxNumActions = 2;

        this.soundDuration = 0; 
        this.soundDurationCounter = 0; // counts up to the sound duration

        this.soundLocation = 1; // 0 is left, 1 is right, 2 is none
        this.soundType = 0; // -1, 0, 1 : 0, 1, 2


        this.soundStartProbability = .5;
        this.soundTypeProbability = .8; // % which are bad
        this.soundLocationProbability = .65; // 65% chance on the left

        this.cellByLocs = this.numberOfCells*this.soundLocations;
        this.cellByLocsByType = this.cellByLocs*this.soundTypes;

        this.Rarr = Rarr;
      },
      getSoundState: function () {
        // if there is a sound, decrease the counter and return the sound state
        if (this.soundDurationCounter < this.soundDuration){
          this.soundDurationCounter++;
          return this.calcSoundState();
        }

        // else, given some probability, dont make a new sound
        // if (Math.random() < this.soundStartProbability){
        //   this.soundType = 1; // for no sound
        //   this.soundLocation = 2;
        //   this.soundDuration = 0;
        //   this.soundDurationCounter = 0;
        // //     console.log('No sound');
        //   return this.calcSoundState();
        // }

        // else make a new sound

        this.soundLocation = (Math.random() < this.soundLocationProbability) ? 0 : 1;
        this.soundDuration = 6;//Math.ceil(Math.random()*this.maxSoundDuration); // some duration between 1-maxSoundDuration
        this.soundDurationCounter = 0;
        this.soundType = 1;//(Math.random() < this.soundTypeProbability) ? 0 : 2;

       // console.log('New sound: Location: ' + this.soundLocation + '  soundDuration: ' + this.soundDuration + '  soundType: ' + this.soundType);

        return this.calcSoundState();
      },
      calcSoundState: function(){
        return this.soundLocation*this.numberOfCells + this.soundType*this.cellByLocs + this.soundDurationCounter*this.cellByLocsByType; 
      },
      reward: function(cell, newCell, action) {
        // the reward 0 everywhere unless the agent is in the cell emitting sound.
        // then it is the type of sound times the durationCounter  
        
        this.Rarr = R.zeros(this.numberOfCells);

        var rewardCell = 0;
        if (this.soundLocation == 1){
          rewardCell = this.numberOfCells -1;
        }

        //this.Rarr[rewardCell] = (this.soundType - 1)*(this.soundDuration - this.soundDurationCounter); // reward is reduced over time
        this.Rarr[rewardCell] = this.soundDuration - this.soundDurationCounter;
       // this.Rarr[rewardCell] = 1;

        var rewardInRewardCell = this.Rarr[rewardCell];

        return this.Rarr[newCell] - 0.001;
      },
      moveToCell: function(cell,a) {
        var newCell = cell + 2*a - 1; // if moving left (0), move left, if moving right, move right

        if (newCell < 0 || newCell > (this.numberOfCells - 1)){ // keep agent in bounds
          newCell = cell;
        }
        return newCell;
      },
      sampleNextState: function(cell,a) {
        var newCell = this.moveToCell(cell,a);

        var soundState = this.getSoundState();

        var r = this.reward(cell, newCell, a); ; // observe the raw reward of being in s, taking a, and ending up in ns
       // r -= 0.001; // every step takes a bit of negative reward
        //console.log('nextState: ' + newCell + soundState);

        var out = {'s':parseInt(newCell + soundState), 'r':r, 'cell': newCell, 'soundType': this.soundType - 1, 'soundLocation': this.soundLocation};

        if(this.currentIteration == this.terminalIteration) {
          // episode is over
          out.reset_episode = true;
        }
        return out;
      },
      allowedActions: function(s) {
        return [0,1];
      },
      startState: function() { return this.startCell + 0*this.numberOfCells + 0*this.cellByLocs; }, 
      getNumStates: function() { return this.numberOfCells*this.soundLocations*this.soundTypes*(this.maxSoundDuration +1); },
      getMaxNumActions: function() { return this.maxNumActions; },
      stox: function(s) { return Math.floor(s/this.cellHeight); },
      stoy: function(s) { return s % this.cellHeight; },
      xytos: function(x,y) { return x*this.cellHeight + y; },      
    }

    // ------
    // UI
    // ------
    var rs = {};
    var trs = {};
    var tvs = {};
    var pas = {};
    var cellsize = 60;  // cell size
    var initGrid = function() {
      var d3elt = d3.select('#draw');
      d3elt.html('');
      rs = {};
      trs = {};
      tvs = {};
      pas = {};

      var cellHeight= 1;///env.gh; // height in cells
      var cellWidth = env.cellWidth; // width in cells
      var numberOfCells = env.numberOfCells; // total number of cells

      var w = cellsize*cellWidth;
      var h = cellsize*cellHeight;
      svg = d3elt.append('svg').attr('width', w).attr('height', h)
        .append('g').attr('transform', 'scale(1)');

      // define a marker for drawing arrowheads
      svg.append("defs").append("marker")
        .attr("id", "arrowhead")
        .attr("refX", 3)
        .attr("refY", 2)
        .attr("markerWidth", 3)
        .attr("markerHeight", 4)
        .attr("orient", "auto")
        .append("path")
          .attr("d", "M 0,0 V 4 L3,2 Z");

      for(var y=0;y<cellHeight;y++) {
        for(var x=0;x<cellWidth;x++) {
          var xcoord = x*cellsize;
          var ycoord = y*cellsize;
          var s = env.xytos(x,y);

          var g = svg.append('g');
          // click callbackfor group
          g.on('click', function(ss) {
            return function() { cellClicked(ss); } // close over s
          }(s));

          // set up cell rectangles
          var r = g.append('rect')
            .attr('x', xcoord)
            .attr('y', ycoord)
            .attr('height', cellsize)
            .attr('width', cellsize)
            .attr('fill', '#FFF')
            .attr('stroke', 'black')
            .attr('stroke-width', 2);
          rs[s] = r;

          // reward text
          var tr = g.append('text')
            .attr('x', xcoord + 5)
            .attr('y', ycoord + 55)
            .attr('font-size', 10)
            .text('');
          trs[s] = tr;

          // value text
          var tv = g.append('text')
            .attr('x', xcoord + 5)
            .attr('y', ycoord + 20)
            .text('');
          tvs[s] = tv;
        
          // policy arrows
          pas[s] = []
          for(var a=0;a<2;a++) {
            var pa = g.append('line')
              .attr('x1', xcoord)
              .attr('y1', ycoord)
              .attr('x2', xcoord)
              .attr('y2', ycoord)
              .attr('stroke', 'black')
              .attr('stroke-width', '2')
              .attr("marker-end", "url(#arrowhead)");
            pas[s].push(pa);
          }
        }
      }

      // append agent position circle
      svg.append('circle')
        .attr('cx', -100)
        .attr('cy', -100)
        .attr('r', 15)
        .attr('fill', '#FF0')
        .attr('stroke', '#000')
        .attr('id', 'cpos');

    }

    var drawGrid = function() {
      var cellHeight = env.cellHeight; // height in cells
      var cellWidth = env.cellWidth; // width in cells
      var numberOfCells = env.numberOfCells; // total number of cells

      var sx = env.stox(state);
      var sy = env.stoy(state);      
      d3.select('#cpos')
        .attr('cx', sx*cellsize+cellsize/2)
        .attr('cy', sy*cellsize+cellsize/2);

      // updates the grid with current state of world/agent
      for(var y=0;y<cellHeight;y++) {
        for(var x=0;x<cellWidth;x++) {
          var xcoord = x*cellsize;
          var ycoord = y*cellsize;
          var r=255,g=255,b=255;
          var s = env.xytos(x,y); // the cell that the agent is in
          
          // get value of state s under agent policy
          if(typeof agent.V !== 'undefined') {
            var vv = agent.V[s];
          } else if(typeof agent.Q !== 'undefined'){
            var poss = env.allowedActions(s);
            var vv = -1;
            for(var i=0,n=poss.length;i<n;i++) {
              var qsa = agent.Q[poss[i]*numberOfCells+s];
              if(i === 0 || qsa > vv) { vv = qsa; }
            }
          }

          var ms = 100;
          if(vv > 0) { g = 255; r = 255 - vv*ms; b = 255 - vv*ms; }
          if(vv < 0) { g = 255 + vv*ms; r = 255; b = 255 + vv*ms; }
          var vcol = 'rgb('+Math.floor(r)+','+Math.floor(g)+','+Math.floor(b)+')';

          // update colors of rectangles based on value
          var r = rs[s];
          if(s === selected) {
            // highlight selected cell
            r.attr('fill', '#FF0');
          } else {
            r.attr('fill', vcol); 
          }

          // write reward texts
          var rv = env.Rarr[s];
          var tr = trs[s];
          tr.text('R ' + rv.toFixed(1));

         // //  write value
         var tv = tvs[s];
         tv.text(vv.toFixed(2));
          
          // update policy arrows
          var paa = pas[s];
          for(var a=0;a<2;a++) {
            var pa = paa[a];
            var prob = agent.P[a*numberOfCells+s];
            if(prob < 0.01) { pa.attr('visibility', 'hidden'); }
            else { pa.attr('visibility', 'visible'); }
            var ss = cellsize/2 * prob * 0.9;
           if(a === 0) {nx=-ss; ny=0;}
           if(a === 1) {nx=ss; ny=0;}
           pa.attr('x1', xcoord+cellsize/2)
             .attr('y1', ycoord+cellsize/2)
             .attr('x2', xcoord+cellsize/2+nx)
             .attr('y2', ycoord+cellsize/2);
          }
        }
      }
    }

    var selected = -1;
    var cellClicked = function(s) {
      if(s === selected) {
        selected = -1; // toggle off
        $("#creward").html('(select a cell)');
      } else {
        selected = s;
        $("#creward").html(env.Rarr[s].toFixed(2));
        $("#rewardslider").slider('value', env.Rarr[s]);
      }
      drawGrid(); // redraw
    }

    var goslow = function() {
      steps_per_tick = 1;
    }
    var gonormal = function(){
      steps_per_tick = 100;
    }
    var gofast = function() {
      steps_per_tick = 250;
    }
    var steps_per_tick = 1;
    var sid = -1;
    var nsteps_history = [];
    var nsteps_counter = 0;
    var nextAction = 2;
    var nflot = 100;

    var tdlearn = function() {
      if(sid === -1) {
        sid = setInterval(function(){
          for(var k=0;k<steps_per_tick;k++) {

            var a = agent.act(observation); // the next state is in the observation
            state = observation.cell;
            observation = env.sampleNextState(observation.cell, a); // run it through environment dynamics

            agent.learn(observation.r); // allow opportunity for the agent to learn
            agent.totalReward += observation.r;

            nsteps_counter += 1;


            if(nsteps_counter == env.terminalIteration) {
              //agent.resetEpisode();

              // record the reward achieved
              if(nsteps_history.length >= nflot) {
                nsteps_history = nsteps_history.slice(1);
              }

              nsteps_history.push(agent.totalReward);

              console.log(agent.totalReward);
              //agent.totalReward = 0;
              nsteps_counter = 0;
            }
            drawGrid(); // draw
          }
          // keep track of reward history
        }, 200);
      } else { 
        clearInterval(sid); 
        sid = -1;
      }
    }

    function resetAgent() {
      eval($("#agentspec").val())
      agent = new RL.LineWorldTD(env, spec);
      agent.totalReward = 0;
      $("#slider").slider('value', agent.epsilon);
      $("#eps").html(agent.epsilon.toFixed(2));
      state = env.startState(); // move state to beginning too
      drawGrid();
    }

    function resetAll() {
      env.reset();
      agent.reset();
      drawGrid();
    }

    function initGraph() {
      var container = $("#flotreward");
      var res = getFlotRewards(nsteps_history);
      series = [{
        data: res,
        lines: {fill: true}
      }];
      var plot = $.plot(container, series, {
        grid: {
          borderWidth: 1,
          minBorderMargin: 20,
          labelMargin: 10,
          backgroundColor: {
            colors: ["#FFF", "#e4f4f4"]
          },
          margin: {
            top: 10,
            bottom: 10,
            left: 10,
          }
        },
        xaxis: {
          min: 0,
          max: nflot
        },
        yaxis: {
          min: -300,
          max: 300
        }
      });

      setInterval(function(){
        series[0].data = getFlotRewards(nsteps_history);
        plot.setData(series);
        plot.draw();
      }, 100);
    }
    function getFlotRewards(arr) {
      // zip rewards into flot data
      var res = [];
      for(var i=0,n=arr.length;i<n;i++) {
        res.push([i, arr[i]]);
      }
      return res;
    }

    var state;
    var agent, env;
    var observation;
    function start() {
      env = new Lineworld(); // create environment
      state = env.startState();
      observation = {'cell': 1, 's': env.startState()};
      eval($("#agentspec").val())
      agent = new RL.LineWorldTD(env, spec);
      agent.totalReward = 0;

      // slider sets agent epsilon
      $( "#slider" ).slider({
        min: 0,
        max: 1,
        value: agent.epsilon,
        step: 0.01,
        slide: function(event, ui) {
          agent.epsilon = ui.value;
          $("#eps").html(ui.value.toFixed(2));
        }
      });

      $("#rewardslider").slider({
        min: -5,
        max: 5.1,
        value: 0,
        step: 0.1,
        slide: function(event, ui) {
          if(selected >= 0) {
            env.Rarr[selected] = ui.value;
            $("#creward").html(ui.value.toFixed(2));
            drawGrid();
          } else {
            $("#creward").html('(select a cell)');
          }
        }
      });

      $("#eps").html(agent.epsilon.toFixed(2));
      $("#slider").slider('value', agent.epsilon);

      // render markdown
      $(".md").each(function(){
        $(this).html(marked($(this).html()));
      });
      renderJax();

      initGrid();
      drawGrid();
      initGraph();
    }

    var jaxrendered = false;
    function renderJax() {
      if(jaxrendered) { return; }
      (function () {
        var script = document.createElement("script");
        script.type = "text/javascript";
        script.src  = "http://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS-MML_HTMLorMML";
        document.getElementsByTagName("head")[0].appendChild(script);
        jaxrendered = true;
      })();
    }