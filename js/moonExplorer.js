var moonLocator;
(function(locator) {
    "use strict";
    // Default config
    var config = {
        "1": "http://cndlunarlocator.herokuapp.com/vehicles/1/locate",
        "2": "http://cndlunarlocator.herokuapp.com/vehicles/2/locate",
        "3": "http://cndlunarlocator.herokuapp.com/vehicles/3/locate",
        "4": "http://cndlunarlocator.herokuapp.com/vehicles/4/locate",
        "5": "http://cndlunarlocator.herokuapp.com/vehicles/5/locate"
    };

    var Map = (function() {
        function Map(config, elementId, loadCallback) {
            this.defaultMapConfig = {
                center: { lat: 0.681400, lng: 23.460550 },
                zoom: 1,
                streetViewControl: false
            };
            this.state = {
                lastCenter: null,
                lastZoom: 1
            };
            this.isMapScriptLoaded = false;
            this.GOOGLE_MAPS_URL = "//maps.google.com/maps/api/js?libraries=geometry&callback=";
            this.mapConfig = config;
            this.mapElementId = elementId;
            this.mapLoadCallback = loadCallback;

            // Load google map script function
            var loadScript = function(src) {
                    var script = document.createElement("script"),
                        loaded;
                    script.src = src;
                    document.getElementsByTagName("head")[0].appendChild(script);
                },
                callBackName = "locator_callback_" + (new Date()).getTime(),
                self = this;
            window[callBackName] = function() {
                self.isMapScriptLoaded = true;
                self.initializeMap();
                self.mapLoadCallback();
            };
            loadScript((this.GOOGLE_MAPS_URL + callBackName));
        }
        // checks if map is defined
        Map.prototype.checkMap = function() {
            return typeof window["google"] === "undefined" || window["google"] === null;
        };
        // map initialization
        Map.prototype.initializeMap = function() {
            var _this = this;
            if (this.checkMap()) {
                return;
            }
            var self = this;
            this.mapConfig = $.extend({}, this.defaultMapConfig, this.mapConfig);
            this.mapElement = document.getElementById(this.mapElementId);
            this.map = new google.maps.Map(this.mapElement, this.mapConfig);

            // Normalizes the coords that tiles repeat across the x axis (horizontally)
            // like the standard Google map tiles.
            function getNormalizedCoord(coord, zoom) {
                var y = coord.y;
                var x = coord.x;
                // tile range in one direction range is dependent on zoom level
                // 0 = 1 tile, 1 = 2 tiles, 2 = 4 tiles, 3 = 8 tiles, etc
                var tileRange = 1 << zoom;
                // don't repeat across y-axis (vertically)
                if (y < 0 || y >= tileRange) {
                    return null;
                }
                // repeat across x-axis
                if (x < 0 || x >= tileRange) {
                    x = (x % tileRange + tileRange) % tileRange;
                }
                return { x: x, y: y };
            }

            // map type Moon
            var moonMapType = new google.maps.ImageMapType({
                getTileUrl: function(coord, zoom) {
                    var normalizedCoord = getNormalizedCoord(coord, zoom);
                    if (!normalizedCoord) {
                        return null;
                    }
                    var bound = Math.pow(2, zoom);
                    return '//mw1.google.com/mw-planetary/lunar/lunarmaps_v1/clem_bw' +
                        '/' + zoom + '/' + normalizedCoord.x + '/' +
                        (bound - normalizedCoord.y - 1) + '.jpg';
                },
                tileSize: new google.maps.Size(256, 256),
                maxZoom: 9,
                minZoom: 3,
                name: 'Moon'
            });

            this.map.mapTypes.set('moon', moonMapType);
            this.map.setMapTypeId('moon');
        };

        // get map
        Map.prototype.getMap = function() {
            return this.map;
        };

        // calculate distance function
        Map.prototype.calculateDistance = function(from, to) {
            var distanceFromBase = google.maps.geometry.spherical.computeDistanceBetween(new google.maps.LatLng({ lat: from.lat, lng: from.lng }), new google.maps.LatLng({ lat: to.lat, lng: to.lng }, 1738000));
            return (Math.round((distanceFromBase / 1000)) + ' KMs');
        };

        // load APIs that returns vehicle coords
        Map.prototype.loadJSON = function(jsonURL) {
            var def = new $.Deferred();
            var mapCoords = "";
            var settings = {
                "type": "GET",
                "dataType": "json",
                "url": jsonURL,
                "cache": false
            };
            $.ajax(settings).done(function(data) {
                def.resolve(data);
            })
            return def.promise();
        };

        // add marker on the map
        Map.prototype.addMarker = function(location, type) {
            var myDist = this.calculateDistance({ lat: 0.681400, lng: 23.460550 }, { lat: location.lat, lng: location.lng });
            var marker = new google.maps.Marker({
                position: new google.maps.LatLng(location),
                map: this.map,
                icon: "./img/" + type + "-pin.png"
            });
            var infowindow = new google.maps.InfoWindow({
                content: "Distance from base: " + myDist
            });
            infowindow.open(this.map, marker);
        };

        // define vehicle marker coords
        Map.prototype.addPin = function(n) {
            var pin = this.loadJSON(config[n]),
                that = this;
            pin.then(function(myCoords) {
                that.addMarker({ "lat": myCoords.lat, "lng": myCoords.long }, "default");
            });
        };

        // define custom marker coords (supplied by user on the screen)
        Map.prototype.locateLatLng = function() {
            var myDist = "";
            var findLat = parseFloat($("#txtLat").val());
            var findLng = parseFloat($("#txtLng").val());
            if (!Number.isNaN(findLat) && !Number.isNaN(findLng)) {
                $("#error").hide();
                this.addMarker({ "lat": findLat, "lng": findLng }, "custom");
            } else {
                $("#error").html("Please enter valid Lat / Long").show();
            }


        };

        Map.prototype.locateVehicle = function() {
            var vId = $("#locateVehicle").val();
            this.addPin(vId);
        }

        return Map;
    })();
    moonLocator.Map = Map;
})(moonLocator || (moonLocator = {}));


/**************** 
TODOs:
-----------------
1. GRUNT
2. move Locate and Search form configuration to separate function
3. Add animations / transitions 
4. code comments
5. Enhance look and feel
6. Enhance user intraction

********************/
