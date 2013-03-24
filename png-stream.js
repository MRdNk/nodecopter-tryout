// Run this to receive a png image stream from your drone.

var arDrone = require('ar-drone');
var http    = require('http');
var fs = require('fs');

//console.log('Connecting png stream ...');
//var pngStream = arDrone.createPngStream();
BOTTOM=3
TOP=0
client = arDrone.createClient()
client.config('video:video_channel', TOP);
client.config('general:navdata_demo', 'FALSE');
client.config('detect:enemy_colors', '3');	// Use the colour detection
client.config('detect:detect_type', '10');
client.config('detect:detections_select_h', '1');
client.config('control:altitude_max', '2000');

navdata = arDrone.createUdpNavdataStream()

// Kill the drone via a tcp client connection
var net = require('net');
var s = net.createServer(function(c) {
	c.on('data', function(data) {
		if (data == 'stop') {
			console.log('stopping');
			client.stop()
			client.land();
		}
	})
})
s.listen(3002);

/*
var lastPng;
var i = 0;
pngStream
  .on('error', console.log)
  .on('data', function(pngBuffer) {
    lastPng = pngBuffer;
	fs.writeFile('pngs/'+(i++)+'.png', pngBuffer);
  });

var server = http.createServer(function(req, res) {
  if (!lastPng) {
    res.writeHead(503);
    res.end('Did not receive any png data yet.');
    return;
  }

  res.writeHead(200, {'Content-Type': 'image/png'});
  res.end(lastPng);
});

server.listen(8080, function() {
  console.log('Serving latest png on port 8080 ...');
});
*/

client.stop();
client.takeoff();

client.up(0.5);
client.after(1000, function () {
	client.stop();
});

var distance = {
		perfect: true
	, tooFar: true
	, tooClose: true
}

var found = false;
var state = {
		found: false 		// has the drone found the colours
	,	distance: distance.perfect

} //'searching'

client.after(2000, function() {
	client.on('navdata', function(data) {
		try {
			// Log when battery getting low
			if (data.demo.batteryPercentage < 20) console.log('Battery: ' + data.demo.batteryPercentage);

		    //console.log('Alt: ' + data.demo.altitude);
		    //console.log(data.visionDetect);

			if (data.visionDetect.nbDetected > 0) {
				if (!state.found) {
					client.stop()
					state.found = true
				}

				vd = data.visionDetect
				console.log('distance', vd.dist);

				// state.distance
				if (vd.dist[0] > 100 && state.distance !== distance.tooFar) {
					// Check if the current distance state is !tooFar
					client.stop()
					console.log('forwards' + vd.dist[0])
					state.distance === distance.tooFar
					client.front(0.2);

				} else if (vd.dist[0] < 100 && state.distance !== distance.tooClose)  {
					//  check if the distance state is !tooClose
					client.stop()
					console.log('back')
					state.distance === distance.tooClose
					client.back(0.2);
				} else if (state.distance !== 'perfect') {
					// check if the distance state is !perfect
					client.stop();
					state.distance = 'perfect'
					console.log('perfect distance so, do nothing')
				} 
				else {
					// if none of the above, then set to perfect
					state.distance === distance.perfect
					client.stop()
				}

				if (vd.yc > 550) {
					client.down(0.2);
				} else if (vd.yc < 450) {
					client.up(0.2);
				} else {
					client.up(0);
				}

				if (vd.xc > 600) {
					client.right(0.2);
				} else if (vd.xc < 400) {
					client.left(0.2);
				} else {
					client.left(0);
				}
				
			} else {
				if (state.found) {
					// Stop following and start searching
					state.found = false;
					console.log(state)
					client.stop()
				}
				
				client.clockwise(0.7);
			}
		} catch (error) {

		}

	});
});

// land the drone when killing the program (Ctrl+C)
process.on('SIGINT', function () {
	client.stop() && client.land();
	setTimeout(function () {
		process.exit(0);
	}, 1000)
});
