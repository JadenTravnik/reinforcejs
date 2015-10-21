
var RL = {};
(function(global) {
  "use strict";

// syntactic sugar function for getting default parameter values
var getopt = function(opt, field_name, default_value) {
  if(typeof opt === 'undefined') { return default_value; }
  return (typeof opt[field_name] !== 'undefined') ? opt[field_name] : default_value;
}

var zeros = R.zeros; // inherit these
var assert = R.assert;
var randi = R.randi;
var randf = R.randf;

var setConst = function(arr, c) {
  for(var i=0,n=arr.length;i<n;i++) {
    arr[i] = c;
  }
}

var sampleWeighted = function(p) {
  var r = Math.random();
  var c = 0.0;
  for(var i=0,n=p.length;i<n;i++) {
    c += p[i];
    if(c >= r) { return i; }
  }
  assert(false, 'wtf');
}

// ------
// AGENTS
// ------

// DPAgent performs Value Iteration
// - can also be used for Policy Iteration if you really wanted to
// - requires model of the environment :(
// - does not learn from experience :(
// - assumes finite MDP :(
var DPAgent = function(env, opt) {
  this.V = null; // state value function
  this.P = null; // policy distribution \pi(s,a)
  this.env = env; // store pointer to environment
  this.gamma = getopt(opt, 'gamma', 0.75); // future reward discount factor
  this.reset();
}
DPAgent.prototype = {
  reset: function() {
    // reset the agent's policy and value function
    this.ns = this.env.getNumStates();
    this.na = this.env.getMaxNumActions();
    this.V = zeros(this.ns);
    this.P = zeros(this.ns * this.na);
    // initialize uniform random policy
    for(var s=0;s<this.ns;s++) {
      var poss = this.env.allowedActions(s);
      for(var i=0,n=poss.length;i<n;i++) {
        this.P[poss[i]*this.ns+s] = 1.0 / poss.length;
      }
    }
  },
  act: function(s) {
    // behave according to the learned policy
    var poss = this.env.allowedActions(s);
    var ps = [];
    for(var i=0,n=poss.length;i<n;i++) {
      var a = poss[i];
      var prob = this.P[a*this.ns+s];
      ps.push(prob);
    }
    var maxi = sampleWeighted(ps);
    return poss[maxi];
  },
  learn: function() {
    // perform a single round of value iteration
    self.evaluatePolicy(); // writes this.V
    self.updatePolicy(); // writes this.P
  },
  evaluatePolicy: function() {
    // perform a synchronous update of the value function
    var Vnew = zeros(this.ns);
    for(var s=0;s<this.ns;s++) {
      // integrate over actions in a stochastic policy
      // note that we assume that policy probability mass over allowed actions sums to one
      var v = 0.0;
      var poss = this.env.allowedActions(s);
      for(var i=0,n=poss.length;i<n;i++) {
        var a = poss[i];
        var prob = this.P[a*this.ns+s]; // probability of taking action under policy
        if(prob === 0) { continue; } // no contribution, skip for speed
        var ns = this.env.nextStateDistribution(s,a);
        var rs = this.env.reward(s,a,ns); // reward for s->a->ns transition
        v += prob * (rs + this.gamma * this.V[ns]);
      }
      Vnew[s] = v;
    }
    this.V = Vnew; // swap
  },
  updatePolicy: function() {
    // update policy to be greedy w.r.t. learned Value function
    for(var s=0;s<this.ns;s++) {
      var poss = this.env.allowedActions(s);
      // compute value of taking each allowed action
      var vmax, nmax;
      var vs = [];
      for(var i=0,n=poss.length;i<n;i++) {
        var a = poss[i];
        var ns = this.env.nextStateDistribution(s,a);
        var rs = this.env.reward(s,a,ns);
        var v = rs + this.gamma * this.V[ns];
        vs.push(v);
        if(i === 0 || v > vmax) { vmax = v; nmax = 1; }
        else if(v === vmax) { nmax += 1; }
      }
      // update policy smoothly across all argmaxy actions
      for(var i=0,n=poss.length;i<n;i++) {
        var a = poss[i];
        this.P[a*this.ns+s] = (vs[i] === vmax) ? 1.0/nmax : 0.0;
      }
    }
  },
}

// exports
global.DPAgent = DPAgent;
})(RL);