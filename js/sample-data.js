/* ============================================================
   sample-data.js — fake seed reports used the very first time
   the app runs on a browser (see storage.js -> getAllReports()).
   Locations are real Bangalore spots so the map looks credible
   in demos. Timestamps are relative to "now" so "x days ago"
   labels always look fresh — see utils.js -> timeAgo().
   ============================================================ */

function daysAgoISO(days, hours = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}

const EVS_SAMPLE_DATA = [
  { id: "seed-1", category: "water", subtype: "foam", lat: 12.9352, lng: 77.6907, timestamp: daysAgoISO(0, 3), note: "Thick white foam near the western bank after last night's rain.", photo: null, locationName: "Bellandur Lake" },
  { id: "seed-2", category: "water", subtype: "dead_fish", lat: 12.9358, lng: 77.6920, timestamp: daysAgoISO(1), note: "Several dead fish washed up near the walking path.", photo: null, locationName: "Bellandur Lake" },
  { id: "seed-3", category: "tree", subtype: "cut", lat: 12.9783, lng: 77.6408, timestamp: daysAgoISO(2), note: "Two large rain trees felled overnight, stumps still fresh.", photo: null, locationName: "Ulsoor Lake Road" },
  { id: "seed-4", category: "tree", subtype: "planted", lat: 12.9611, lng: 77.6387, timestamp: daysAgoISO(3), note: "Community sapling drive — 12 saplings planted along the median.", photo: null, locationName: "Koramangala 80 Feet Road" },
  { id: "seed-5", category: "water", subtype: "algae", lat: 13.0298, lng: 77.6199, timestamp: daysAgoISO(4), note: "Green algae bloom spreading across the southern half.", photo: null, locationName: "Hebbal Lake" },
  { id: "seed-6", category: "water", subtype: "trash", lat: 13.0310, lng: 77.6180, timestamp: daysAgoISO(5), note: "Plastic waste piling up near the storm-water inlet.", photo: null, locationName: "Hebbal Lake" },
  { id: "seed-7", category: "tree", subtype: "cut", lat: 12.9147, lng: 77.6497, timestamp: daysAgoISO(6), note: "", photo: null, locationName: "Koramangala 3rd Block" },
  { id: "seed-8", category: "water", subtype: "odor", lat: 12.9698, lng: 77.7500, timestamp: daysAgoISO(7), note: "Strong sewage smell near the eastern inlet, especially in the evening.", photo: null, locationName: "Varthur Lake" },
  { id: "seed-9", category: "tree", subtype: "planted", lat: 12.9569, lng: 77.7011, timestamp: daysAgoISO(8), note: "Native species planted as part of the RWA green drive.", photo: null, locationName: "Whitefield Main Road" },
  { id: "seed-10", category: "water", subtype: "foam", lat: 12.9091, lng: 77.6042, timestamp: daysAgoISO(9), note: "Foam visible from the flyover, worse than last month.", photo: null, locationName: "Madivala Lake" },
  { id: "seed-11", category: "tree", subtype: "cut", lat: 12.9850, lng: 77.5533, timestamp: daysAgoISO(10), note: "Roadside trees cleared for metro pillar work.", photo: null, locationName: "Malleshwaram 18th Cross" },
  { id: "seed-12", category: "water", subtype: "dead_fish", lat: 13.0827, lng: 77.5877, timestamp: daysAgoISO(11), note: "", photo: null, locationName: "Yelahanka Lake" },
  { id: "seed-13", category: "water", subtype: "algae", lat: 12.8988, lng: 77.5773, timestamp: daysAgoISO(12), note: "Persistent algae mat near the boating area.", photo: null, locationName: "Puttenahalli Lake" },
  { id: "seed-14", category: "tree", subtype: "planted", lat: 12.9279, lng: 77.6271, timestamp: daysAgoISO(13), note: "20 saplings along the lakeside walking track.", photo: null, locationName: "Ejipura Lakeside Path" },
  { id: "seed-15", category: "water", subtype: "trash", lat: 12.9840, lng: 77.7010, timestamp: daysAgoISO(14), note: "Construction debris dumped along the bund road.", photo: null, locationName: "Kaikondrahalli Lake" },
  { id: "seed-16", category: "tree", subtype: "cut", lat: 12.9394, lng: 77.5980, timestamp: daysAgoISO(15), note: "Old banyan branch removed after storm damage — looked deliberate, not just pruning.", photo: null, locationName: "Jayanagar 4th Block" },
  { id: "seed-17", category: "water", subtype: "odor", lat: 12.9070, lng: 77.6410, timestamp: daysAgoISO(16), note: "Odor noticeable only near the outflow drain.", photo: null, locationName: "Bilekahalli Lake" },
  { id: "seed-18", category: "tree", subtype: "planted", lat: 13.0067, lng: 77.5478, timestamp: daysAgoISO(18), note: "Avenue plantation along the service road.", photo: null, locationName: "Yeshwanthpur Service Road" },
];
