var Job = require('./Job');
var validateUrl = require('./jobs/validate');

var job = new Job({
	'cwd': 'c:\\pyxis\\trunk\\application\\PyxisCLI\\bin\\Release',
	'exec': 'c:\\pyxis\\trunk\\application\\PyxisCLI\\bin\\Release\\pyx.exe',
	//'args': ['url','list']
	'args': ['url','discover','https://gis.calgary.ca/arcgis/rest/services/']
});
console.log(job.id);

function performJob(job) {
	job.start();
	job.on('error', function(job,error) {
		console.log(error);
	});
	job.on('usage',function(job,usage) {
		console.log(usage);
	});
	// job.on('stdout',function(data) {
	// 	//not sure console to handle new lines correctly
	// 	process.stdout.write(data);
	// });
	job.on('line',function(job,line) {
		console.log(line);
	});
	job.on('exit',function(job) {
		console.log('done');
	});
}

var context = {
	performJob
}

/*
https://gis.calgary.ca/arcgis/rest/services/ : Discovered (77% working of 208 DataSets / 30 Broken)
https://map.oshawa.ca/arcgis/rest/services/ : Discovered (86% working of 29 DataSets / 0 Broken)
http://ec.gc.ca/arcgis/rest/services/ : Discovered (35% working of 2701 DataSets / 0 Broken)
http://maps.esri.ca/arcgis/rest/services/ : Discovered (11% working of 507 DataSets / 47 Broken)
http://maps.gov.nl.ca/gsdw/rest/services/ : Discovered (58% working of 193 DataSets / 17 Broken)
http://www.agr.gc.ca/atlas/rest/services/ : Discovered (19% working of 978 DataSets / 76 Broken)
https://data.gns.cri.nz/gis/rest/services/ : Discovered (56% working of 215 DataSets / 54 Broken)
http://maps.ducks.ca/arcgis/rest/services/ : Discovered (82% working of 236 DataSets / 8 Broken)
http://maps.ottawa.ca/arcgis/rest/services/ : Discovered (81% working of 238 DataSets / 6 Broken)
https://gis1.usgs.gov/arcgis/rest/services/ : Discovered (92% working of 2564 DataSets / 62 Broken)
http://maps.simcoe.ca/arcgis/rest/services/ : Discovered (71% working of 503 DataSets / 95 Broken)
https://imgis.nps.gov/ArcGIS/rest/services/ : Discovered (89% working of 528 DataSets / 79 Broken)
http://gis.brandon.ca/arcgis/rest/services/ : Discovered (84% working of 585 DataSets / 30 Broken)
http://gis.saanich.ca/arcgis/rest/services/ : Discovered (84% working of 113 DataSets / 1 Broken)
http://geoportal.gc.ca/arcgis/rest/services/ : Discovered (61% working of 956 DataSets / 710 Broken)
http://www.rdcogis.com/arcgis/rest/services/ : Discovered (39% working of 481 DataSets / 8 Broken)
https://maps.durham.ca/arcgis/rest/services/ : Discovered (95% working of 231 DataSets / 0 Broken)
http://geodata.epa.gov/ArcGIS/rest/services/ : Discovered (50% working of 2031 DataSets / 307 Broken)
https://apps.fs.usda.gov/ArcX/rest/services/ : Discovered (0% working of 114 DataSets / 59 Broken)
http://maps.wakegov.com/arcgis/rest/services/ : Discovered (85% working of 274 DataSets / 6 Broken)
http://map.cranbrook.ca/arcgis/rest/services/ : Discovered (87% working of 56 DataSets / 4 Broken)
https://edumaps.esri.ca/arcgis/rest/services/ : Discovered (41% working of 70 DataSets / 37 Broken)
https://geoweb.bcogc.ca/arcgis/rest/services/ : Discovered (0% working of 121 DataSets / 0 Broken)
http://gis.coquitlam.ca/ArcGIS/rest/services/ : Discovered (0% working of 139 DataSets / 124 Broken)
http://maps.gov.bc.ca/arcserver/rest/services/ : Discovered (52% working of 381 DataSets / 66 Broken)
https://maps.alberta.ca/genesis/rest/services/ : Discovered (0% working of 3155 DataSets / 0 Broken)
https://gisweb.fcgov.com/arcgis/rest/services/ : Discovered (0% working of 255 DataSets / 0 Broken)
http://gis.mountpearl.ca/ArcGIS/rest/services/ : Discovered (84% working of 79 DataSets / 10 Broken)
http://dnrmaps.gov.nl.ca/arcgis/rest/services/ : Discovered (0% working of 515 DataSets / 0 Broken)
https://gis.rvca.ca/arcgis_rvca/rest/services/ : Discovered (60% working of 107 DataSets / 15 Broken)
https://mapsvr.tol.ca/arcgisext/rest/services/ : Discovered (0% working of 192 DataSets / 0 Broken)
http://gis.ncdc.noaa.gov/arcgis/rest/services/ : Discovered (0% working of 534 DataSets / 0 Broken)
https://gis.ecan.govt.nz/arcgis/rest/services/ : Discovered (0% working of 1682 DataSets / 0 Broken)
http://webmap.burnaby.ca/arcgis/rest/services/ : Discovered (0% working of 112 DataSets / 0 Broken)
http://services.ga.gov.au/site_3/rest/services/ : Discovered (0% working of 277 DataSets / 0 Broken)
http://services.ga.gov.au/site_9/rest/services/ : Discovered (70% working of 102 DataSets / 11 Broken)
http://services.ga.gov.au/site_7/rest/services/ : Discovered (0% working of 423 DataSets / 0 Broken)
http://services.ga.gov.au/site_1/rest/services/ : Discovered (0% working of 122 DataSets / 0 Broken)
https://gis.apfo.usda.gov/arcgis/rest/services/ : Discovered (0% working of 931 DataSets / 0 Broken)
https://maps2.dcgis.dc.gov/dcgis/rest/services/ : New (0% working of 0 DataSets / 0 Broken)
http://gis2.medicinehat.ca/ArcGIS/rest/services/ : Discovered (54% working of 154 DataSets / 56 Broken)
https://webmap.afsc.noaa.gov/maps/rest/services/ : Discovered (0% working of 323 DataSets / 0 Broken)
https://www.sciencebase.gov/arcgis/rest/services/ : Discovered (0% working of 3367 DataSets / 0 Broken)
http://maps.dggs.alaska.gov/arcgis/rest/services/ : Discovered (0% working of 1859 DataSets / 0 Broken)
https://gis.saskatchewan.ca/arcgis/rest/services/ : Discovered (62% working of 780 DataSets / 44 Broken)
http://mapservices.gov.yk.ca/arcgis/rest/services/ : Discovered (0% working of 797 DataSets / 0 Broken)
https://maps.townofcary.org/arcgis1/rest/services/ : Discovered (70% working of 264 DataSets / 36 Broken)
http://maps.pittsburghpa.gov/arcgis/rest/services/ : Discovered (86% working of 53 DataSets / 1 Broken)
http://wroms.whiterockcity.ca/wroms/rest/services/ : Discovered (0% working of 528 DataSets / 0 Broken)
http://gis.metrovancouver.org/arcgis/rest/services/ : Discovered (0% working of 926 DataSets / 0 Broken)
https://mapservices.crd.bc.ca/arcgis/rest/services/ : Discovered (0% working of 847 DataSets / 0 Broken)
http://topofthesouthmaps.co.nz/ArcGIS/rest/services/ : Discovered (0% working of 186 DataSets / 0 Broken)
http://apps.geomatics.gov.nt.ca/arcgis/rest/services/ : Discovered (0% working of 736 DataSets / 0 Broken)
http://mapping.burlington.ca/arcgisweb/rest/services/ : Discovered (77% working of 59 DataSets / 0 Broken)
http://carte.ville.quebec.qc.ca/arcgis/rest/services/ : Discovered (0% working of 797 DataSets / 0 Broken)
http://maps.pecounty.on.ca/pecountyext/rest/services/ : Discovered (0% working of 357 DataSets / 0 Broken)
https://services.nationalmap.gov/arcgis/rest/services/ : Discovered (0% working of 320 DataSets / 0 Broken)
http://gis.city.belleville.on.ca/arcgis/rest/services/ : Discovered (76% working of 733 DataSets / 69 Broken)
http://gismapping.stafford.va.us/arcgis/rest/services/ : Discovered (81% working of 177 DataSets / 13 Broken)
https://gis.region.waterloo.on.ca/arcgis/rest/services/ : Discovered (76% working of 490 DataSets / 31 Broken)
http://services.thelist.tas.gov.au/arcgis/rest/services/ : Discovered (0% working of 840 DataSets / 0 Broken)
http://gis.lethbridge.ca/lethwebgisarcgis/rest/services/ : Discovered (0% working of 240 DataSets / 0 Broken)
http://gis.specialareas.ab.ca:6080/arcgis/rest/services/ : Discovered (0% working of 307 DataSets / 0 Broken)
http://gisdata.cityofchesapeake.net/public/rest/services/ : Discovered (0% working of 475 DataSets / 0 Broken)
http://servicesweb.cartes.canada.ca/arcgis/rest/services/ : Discovered (0% working of 155 DataSets / 0 Broken)
https://infogeo.education.gouv.qc.ca/arcgis/rest/services/ : Discovered (4% working of 72 DataSets / 65 Broken)
https://gisservices.information.qld.gov.au/arcgis/rest/services/ : Discovered (0% working of 2471 DataSets / 0 Broken)
http://gis.toronto.ca/arcgis/rest/services/ : Discovered (66% working of 2027 DataSets / 534 Broken)
*/

performJob(validateUrl('http://services.ga.gov.au/site_1/rest/services/',context))
performJob(validateUrl('http://services.ga.gov.au/site_3/rest/services/',context))
performJob(validateUrl('http://services.ga.gov.au/site_7/rest/services/',context))