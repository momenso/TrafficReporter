var i = 0

var app = {
    model: {},
    view: {},
    tabs: {
        sense: {
            index: i++,
            icon: '73-radar',
        },
        capture: {
            index: i++,
            icon: '86-camera',
        },
        status: {
            index: i++,
            icon: '81-dashboard',
        },
        storage: {
            index: i++,
            icon: '33-cabinet',
        },
        phonegap: {
            index: i++,
            icon: '32-iphone',
        },
    },
    platform: /Android/.test(navigator.userAgent) ? 'android': 'ios',
    initialtab: 'sense'
}

console.log(app)


var bb = {
    model: {},
    view: {}
}

bb.init = function() {

    bb.model.State = Backbone.Model.extend({
        defaults: {
            content: 'none'
        },
    });


    bb.model.Report = Backbone.Model.extend(_.extend({
		// defaults: function() {
		// 	return {
		// 		done: false,
		// 		order: app.model.Reports.nextOrder()
		// 	};
		// },

		initialize: function(item) {
			var self = this;
			_.bindAll(self);
		},

		// toggle: function() {
		// 	var self = this
		// 	self.save({ done: !self.get("done") });
		// }

    }));


	bb.model.ReportList = Backbone.Collection.extend({

        model: bb.model.Report,

        url: '/api/rest/report',

        initialize: function() {
            var self = this
            _.bindAll(self)
        },

		// done: function() {
		// 	var self = this
		// 	return self.filter(function(report) { return report.get('done'); });
		// },
		// 
		// remaining: function() {
		// 	var self = this
		// 	return self.without.apply(self, self.done());
		// },
		// 
		// // TODO: enforce order by time? (more recent first)
		// nextOrder: function() {
		// 	var self = this
		// 	if (!self.length) return 1;
		// 		return self.last().get('order') + 1;
		// },
		// 
		// // TODO: compare with date
		// comparator: function(report) {
		// 	return report.get('order');
		// }
		
    });


    bb.view.Navigation = Backbone.View.extend({
        initialize: function(items) {
            var self = this
            _.bindAll(self)

            self.elem = {
                header: $("#header"),
                footer: $("#footer"),
				login_btn: $("#login_btn"),
				logout_btn: $("#logout_btn")
            }

            // self.elem.header.css({
            //     zIndex: 1000
            // })
            // self.elem.footer.css({
            //     zIndex: 1000
            // })

            function handletab(tabname) {
                return function() {
                    app.model.state.set({
                        current: tabname
                    })
                }
            }

            var tabindex = 0
            for (var tabname in app.tabs) {
                // console.log(tabname);
                $("#tab_" + tabname).tap(handletab(tabname));
            }

            app.scrollheight = window.innerHeight - self.elem.header.height() - self.elem.footer.height()
            if ('android' == app.platform) {
                app.scrollheight += self.elem.header.height();
            }

			app.model.state.on('change:user', function() { 
				self.render();
			});
        },

        render: function() { 
	        var self = this;
			var user = app.model.state.get('user');
			
			if (user) {
				console.log('logged as: ' + user.username);
				self.elem.login_btn.hide();
				self.elem.logout_btn.show();
				// self.elem.logout_btn.text(user.username);

				// self.elem.logout_btn.trigger('create');
				// self.elem.logout_btn.button('refresh');
				// self.elem.header.trigger('create');
			} else {
				console.log('No user');
				self.elem.login_btn.show();
				self.elem.logout_btn.hide();				
			}
			
			return self;
		}
    })


    bb.view.Content = Backbone.View.extend({
        initialize: function(initialtab) {
            var self = this;
            _.bindAll(self);

            self.current = initialtab;
            self.scrollers = {};

            app.model.state.on('change:current', self.tabchange);

            window.onresize = function() {
                self.render();
            };

            app.model.state.on('scroll-refresh', function() {
                self.render();
            });
        },

        render: function() {
            var self = this;

            app.view[self.current] && app.view[self.current].render();

	        var content = $("#content_" + self.current);
			var isScrollable = content.hasClass('scroller');
			if (isScrollable) {
				
	            if (!self.scrollers[self.current]) {
	                self.scrollers[self.current] = new iScroll("content_" + self.current);
	            }
				
	            content.height(app.scrollheight)

	            setTimeout(function() {
	                self.scrollers[self.current].refresh();
	            },
	            300)
			}
        },

        tabchange: function() {
            var self = this

            var previous = self.current
            var current = app.model.state.get('current')
            console.log('tabchange prev=' + previous + ' cur=' + current)

            $("#content_" + previous).hide().removeClass('leftin').removeClass('rightin')
            $("#content_" + current).show().addClass(app.tabs[previous].index <= app.tabs[current].index ? 'leftin': 'rightin')
            self.current = current

            self.render()
        }
    })


    bb.view.Sense = Backbone.View.extend({
        initialize: function() {
            var self = this
            _.bindAll(self)

            self.elem = {
                // accel_watch_btn: $('#sense_accel_watch'),
                // accel_stop_btn: $('#sense_accel_stop'),
                // accel_x: $('#sense_accel_x'),
                // accel_y: $('#sense_accel_y'),
                // accel_z: $('#sense_accel_z'),
                // accel_x_val: $('#sense_accel_x_val'),
                // accel_y_val: $('#sense_accel_y_val'),
                // accel_z_val: $('#sense_accel_z_val'),
                // 
                // button: $('#sense_button')
				currentLocation: $('input#currentLocation'),
				speed: $('input#speed'),
				refresh: $('button#refresh')
            }

            // self.elem.accel_watch_btn.tap(function() {
            //     self.watchID = navigator.accelerometer.watchAcceleration(self.update_accel, app.erroralert, {
            //         frequency: 10
            //     })
            // })
            // 
            // self.elem.accel_stop_btn.tap(function() {
            //     self.watchID && navigator.accelerometer.clearWatch(self.watchID)
            // })

			self.elem.refresh.tap(function() {
				navigator.geolocation.getCurrentPosition(
				  function(position) {
				    var latitude  = position.coords.latitude;
				    var longitude = position.coords.longitude;
					var speed = position.coords.speed | 0;
				    var timestamp = new Date(position.timestamp);
				
					self.elem.speed.val(speed);
				
					console.log('loc=' + latitude + "," + longitude);
					var geocoder = new google.maps.Geocoder();
					var latlng = new google.maps.LatLng(latitude, longitude);
					geocoder.geocode({'latLng': latlng}, function(results, status) {
					      if (status == google.maps.GeocoderStatus.OK) {
					        if (results[0]) {
								
//								console.log(results);
								
								var curLocation = results[0].formatted_address;
								
								app.model.Reports.fetch({
									data: { location: curLocation },
									async: false,

									success: function() {
										console.log('Reports loaded successfully: ' + app.model.Reports.length);
										self.add_all_reports();
									},

									error: function(e) {
										console.log('Failed to fetch reports: ' + e);
									}
								});
								
								self.elem.currentLocation.val(curLocation);

					        }
					      } else {
					        alert("Geocoder failed due to: " + status);
					      }
					});
				})
			})

            function call_update_button(name) {
                return function() {
                    self.update_button(name)
                }
            }

            document.addEventListener("backbutton", call_update_button('back'))
            document.addEventListener("menubutton", call_update_button('menu'))
            document.addEventListener("searchbutton", call_update_button('search'))
        },

        render: function() { },

		add_all_reports: function() {
			var self = this;
			
			//$('#reportsListView').empty();
			// $('#reportsListView').children().remove('li');
			$('#reportsListView').children().not('[role=heading]').remove('li');
			
			app.model.Reports.each(function(report) {
				report = report.toJSON();
				var minutes = Math.round((Date.now() - report.created) / 60000);
				self.add_report(report.comment, report.speed, minutes);
			});
		},

		add_report: function(comment, speed, time) {
			var list = $('#reportsListView');
            $('<li/>')
            	.append($('<h2>', { text: comment }))
            	.append($('<p>', { text: speed + ' km/h' }))
            	.append($('<span />', { text: time + ' min', class: 'ui-li-count'}))
            	.appendTo(list);
            list.listview('refresh');
		},

        update_button: function(name) {
            var self = this
            self.elem.button.text(name)
        }
    })


    bb.view.Capture = Backbone.View.extend({
        initialize: function() {
            var self = this;
            _.bindAll(self);

            self.elem = {
				currentLocation: $('input#currentLocation'),
				speed: $('input#speed'),
				comment: $('textarea#comment'),
				send: $('button#send')
            }

            self.elem.send.tap(function() {
				app.model.Reports.create({
					location: self.elem.currentLocation.val(),
					speed: self.elem.speed.val(),
					comment: self.elem.comment.val()
				});
            });

        },

        render: function() { }
    })


    bb.view.Status = Backbone.View.extend({
        initialize: function() {
            var self = this
            _.bindAll(self)

            self.elem = { }
        },
        render: function() { }
    })


    bb.view.Storage = Backbone.View.extend({
        initialize: function() {
            var self = this
            _.bindAll(self)

            self.elem = { }
        },
        render: function() { }
    })


    bb.view.PhoneGap = Backbone.View.extend({
        initialize: function() {
            var self = this
            _.bindAll(self)

            self.elem = {
                name: $('#phonegap_name'),
                phonegap: $('#phonegap_phonegap'),
                platform: $('#phonegap_platform'),
                uuid: $('#phonegap_uuid'),
                version: $('#phonegap_version'),
            }
        },

        render: function() {
            var self = this;
            if (typeof device == 'undefined') {
                alert('Cordova environment required!');
            }
            else {
                self.elem.name.text(device.name);
                self.elem.phonegap.text(device.cordova);
                self.elem.platform.text(device.platform);
                self.elem.uuid.text(device.uuid);
                self.elem.version.text(device.version);
            }
        }
    })

}


app.boot = function() {
    document.ontouchmove = function(e) {
        e.preventDefault();
    }
    $('#main').live('pagebeforecreate',
    function() {
        app.boot_platform()
    })
}

app.boot_platform = function() {
    if ('android' == app.platform) {
        $('#header').hide()
        $('#footer').attr({
            'data-role': 'header'
        })
        $('#content').css({
            'margin-top': 59
        })
    }
}

app.init_platform = function() {
    if ('android' == app.platform) {
        $('li span.ui-icon').css({
            'margin-top': -4
        })
    }
}

app.start = function() {
    $("#tab_" + app.initialtab).tap();

	http.get('/user', function(user) {
	    if (user.id) {
			app.model.state.set({user:user})
		}
	});

}

app.erroralert = function(error) {
    alert(error)
}

app.init = function() {
    console.log('start init')

    app.init_platform()

    bb.init()

    app.model.state = new bb.model.State()
    app.model.Reports = new bb.model.ReportList();

	http.get('/user', function(user) {
		if (user.id) {
			app.model.state.set({user:user});
		} else {
			console.log("No user!");
		}
	});

    app.view.navigation = new bb.view.Navigation(app.initialtab)
    app.view.navigation.render()

    app.view.content = new bb.view.Content(app.initialtab)
    app.view.content.render()

    app.view.sense = new bb.view.Sense()
    app.view.capture = new bb.view.Capture()
    app.view.status = new bb.view.Status()
    app.view.storage = new bb.view.Storage()
    app.view.phonegap = new bb.view.PhoneGap()

    app.start()

    console.log('end init')
}


app.boot()

$(app.init)
