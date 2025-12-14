'use strict';
'require view';
'require poll';
'require dom';
'require rpc';
'require ui';
'require fs';
'require form';
'require uci';

var callServiceList = rpc.declare({
	object: 'service',
	method: 'list',
	params: ['name'],
	expect: { '': {} }
});

return view.extend({
	load: function() {
			return Promise.all([
				callServiceList('zzzcatspeedtest'),
				L.resolveDefault(fs.exec('test', ['-e', '/usr/share/zzzcatspeedtest/speedtest-arm64']), { code: 1 }),
				uci.load('zzzcatspeedtest')
			]);
	},

	render: function(data) {
		var serviceStatus = data ? data[0] : null;
			var testExec = data ? data[1] : null;
			var binaryExists = !!(testExec && testExec.code === 0);
		var isRunning = serviceStatus && serviceStatus.zzzcatspeedtest && 
		                serviceStatus.zzzcatspeedtest.instances && 
		                Object.keys(serviceStatus.zzzcatspeedtest.instances).length > 0;

		var m, s, o;

		m = new form.Map('zzzcatspeedtest', _('ZZZCat Speedtest'),
			_('LAN network speed test tool. Backend listens on port 8989.'));

		s = m.section(form.NamedSection, 'main', 'speedtest');
		s.anonymous = false;
		s.addremove = false;

		o = s.option(form.DummyValue, '_status', _('Status'));
		o.cfgvalue = function() {
			return isRunning ? _('Running') : _('Stopped');
		};
		o.textvalue = function() {
			var status = this.cfgvalue();
			var color = isRunning ? 'green' : 'red';
			return '<span style="color:' + color + ';font-weight:bold">' + status + '</span>';
		};

		// o = s.option(form.DummyValue, '_binary', _('Binary Status (speedtest-arm64)'));
		// o.cfgvalue = function() {
		// 	return binaryExists ? _('Installed') : _('Not Installed');
		// };
		// o.textvalue = function() {
		// 	var status = this.cfgvalue();
		// 	var color = binaryExists ? 'green' : 'red';
		// 	return '<span style="color:' + color + '">' + status + '</span>';
		// };

		// o = s.option(form.Button, '_start', _('Service Control'));
		// o.inputtitle = isRunning ? _('Stop') : _('Start');
		// o.inputstyle = isRunning ? 'reset' : 'apply';
		// 	o.onclick = function() {
		// 	var action = isRunning ? 'stop' : 'start';
		// 	return fs.exec('/etc/init.d/zzzcatspeedtest', [action])
		// 		.then(function() {
		// 			ui.addNotification(null, dom.create('p', {}, _('Service ' + action + ' command executed')));
		// 			window.location.reload();
		// 		})
		// 		.catch(function(e) {
		// 			ui.addNotification(null, dom.create('p', {}, _('Error: ') + e.message), 'error');
		// 		});
		// };

		o = s.option(form.Button, '_open', _('Open Test Page'));
		o.inputtitle = _('Open');
		o.inputstyle = 'action';
		o.onclick = function() {
			window.open('http://' + window.location.hostname + ':8989', '_blank');
		};

		return m.render();
	}
});