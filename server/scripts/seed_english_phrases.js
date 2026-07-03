// Expands the English lexicon entries to ~5000+ total.
// These are the prompts community contributors will translate into endangered languages.
// No endangered language translations here — those come from community.
//
// Run: node server/scripts/seed_english_phrases.js

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

function slug(en) {
  return en.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// [english, pos, category, type, frequency_rank]
const RAW = [

  // ══════════════════════════════════════════════════════════════════
  // GREETINGS & DAILY CONVERSATION
  // ══════════════════════════════════════════════════════════════════
  ['how was your day', 'phrase', 'greetings', 'phrase', 5000],
  ['i missed you', 'phrase', 'greetings', 'phrase', 5001],
  ['long time no see', 'phrase', 'greetings', 'phrase', 5002],
  ['how is your family', 'phrase', 'greetings', 'phrase', 5003],
  ['how is your health', 'phrase', 'greetings', 'phrase', 5004],
  ['welcome to our home', 'phrase', 'greetings', 'phrase', 5005],
  ['please come in', 'phrase', 'greetings', 'phrase', 5006],
  ['please sit down', 'phrase', 'greetings', 'phrase', 5007],
  ['what brings you here', 'phrase', 'greetings', 'phrase', 5008],
  ['are you alone', 'phrase', 'greetings', 'phrase', 5009],
  ['are you married', 'phrase', 'greetings', 'phrase', 5010],
  ['do you have children', 'phrase', 'greetings', 'phrase', 5011],
  ['where are you staying', 'phrase', 'greetings', 'phrase', 5012],
  ['how long are you here for', 'phrase', 'greetings', 'phrase', 5013],
  ['is this your first visit', 'phrase', 'greetings', 'phrase', 5014],
  ['what do you do for work', 'phrase', 'greetings', 'phrase', 5015],
  ['i am a traveler', 'phrase', 'greetings', 'phrase', 5016],
  ['i am a student', 'phrase', 'greetings', 'phrase', 5017],
  ['i am a teacher', 'phrase', 'greetings', 'phrase', 5018],
  ['i am a doctor', 'phrase', 'greetings', 'phrase', 5019],
  ['i am a journalist', 'phrase', 'greetings', 'phrase', 5020],
  ['i am a researcher', 'phrase', 'greetings', 'phrase', 5021],
  ['i am visiting friends', 'phrase', 'greetings', 'phrase', 5022],
  ['i am here for work', 'phrase', 'greetings', 'phrase', 5023],
  ['i am on holiday', 'phrase', 'greetings', 'phrase', 5024],
  ['i love this place', 'phrase', 'greetings', 'phrase', 5025],
  ['your country is beautiful', 'phrase', 'greetings', 'phrase', 5026],
  ['the people here are kind', 'phrase', 'greetings', 'phrase', 5027],
  ['i will come back again', 'phrase', 'greetings', 'phrase', 5028],
  ['i will never forget this', 'phrase', 'greetings', 'phrase', 5029],

  // ══════════════════════════════════════════════════════════════════
  // ASKING FOR HELP & COMMUNICATION
  // ══════════════════════════════════════════════════════════════════
  ['can you help me please', 'phrase', 'communication', 'phrase', 5100],
  ['i need assistance', 'phrase', 'communication', 'phrase', 5101],
  ['i do not speak your language', 'phrase', 'communication', 'phrase', 5102],
  ['is there anyone who speaks english', 'phrase', 'communication', 'phrase', 5103],
  ['can you translate this for me', 'phrase', 'communication', 'phrase', 5104],
  ['please write it down', 'phrase', 'communication', 'phrase', 5105],
  ['can you show me', 'phrase', 'communication', 'phrase', 5106],
  ['point to it please', 'phrase', 'communication', 'phrase', 5107],
  ['i understand a little', 'phrase', 'communication', 'phrase', 5108],
  ['i do not understand at all', 'phrase', 'communication', 'phrase', 5109],
  ['what did you say', 'phrase', 'communication', 'phrase', 5110],
  ['can you say that again', 'phrase', 'communication', 'phrase', 5111],
  ['more slowly please', 'phrase', 'communication', 'phrase', 5112],
  ['one moment please', 'phrase', 'communication', 'phrase', 5113],
  ['i am thinking', 'phrase', 'communication', 'phrase', 5114],
  ['i am not sure', 'phrase', 'communication', 'phrase', 5115],
  ['i think so', 'phrase', 'communication', 'phrase', 5116],
  ['i do not think so', 'phrase', 'communication', 'phrase', 5117],
  ['that is correct', 'phrase', 'communication', 'phrase', 5118],
  ['that is wrong', 'phrase', 'communication', 'phrase', 5119],
  ['i know', 'phrase', 'communication', 'phrase', 5120],
  ['i do not know', 'phrase', 'communication', 'phrase', 5121],
  ['i forgot', 'phrase', 'communication', 'phrase', 5122],
  ['i remember', 'phrase', 'communication', 'phrase', 5123],
  ['really', 'adverb', 'communication', 'word', 5124],
  ['is that true', 'phrase', 'communication', 'phrase', 5125],
  ['i am listening', 'phrase', 'communication', 'phrase', 5126],
  ['go ahead', 'phrase', 'communication', 'phrase', 5127],
  ['never mind', 'phrase', 'communication', 'phrase', 5128],
  ['it does not matter', 'phrase', 'communication', 'phrase', 5129],

  // ══════════════════════════════════════════════════════════════════
  // DIRECTIONS & NAVIGATION (extended)
  // ══════════════════════════════════════════════════════════════════
  ['take me to', 'phrase', 'directions', 'phrase', 5200],
  ['i am going to', 'phrase', 'directions', 'phrase', 5201],
  ['how do i reach', 'phrase', 'directions', 'phrase', 5202],
  ['is there a shortcut', 'phrase', 'directions', 'phrase', 5203],
  ['which road goes to', 'phrase', 'directions', 'phrase', 5204],
  ['is this the right way', 'phrase', 'directions', 'phrase', 5205],
  ['i passed through here before', 'phrase', 'directions', 'phrase', 5206],
  ['at the top of the hill', 'phrase', 'directions', 'phrase', 5207],
  ['at the bottom of the valley', 'phrase', 'directions', 'phrase', 5208],
  ['before the bridge', 'phrase', 'directions', 'phrase', 5209],
  ['after the mosque', 'phrase', 'directions', 'phrase', 5210],
  ['by the river', 'phrase', 'directions', 'phrase', 5211],
  ['on the main road', 'phrase', 'directions', 'phrase', 5212],
  ['off the main road', 'phrase', 'directions', 'phrase', 5213],
  ['the road is unpaved', 'phrase', 'directions', 'phrase', 5214],
  ['the road is flooded', 'phrase', 'directions', 'phrase', 5215],
  ['the bridge is broken', 'phrase', 'directions', 'phrase', 5216],
  ['the path is closed', 'phrase', 'directions', 'phrase', 5217],
  ['there is a checkpoint ahead', 'phrase', 'directions', 'phrase', 5218],
  ['you need a permit for this area', 'phrase', 'directions', 'phrase', 5219],

  // ══════════════════════════════════════════════════════════════════
  // FOOD & RESTAURANT (extended)
  // ══════════════════════════════════════════════════════════════════
  ['i would like to try local food', 'phrase', 'food', 'phrase', 5300],
  ['what do locals eat here', 'phrase', 'food', 'phrase', 5301],
  ['is this dish traditional', 'phrase', 'food', 'phrase', 5302],
  ['what is the name of this food', 'phrase', 'food', 'phrase', 5303],
  ['how is this prepared', 'phrase', 'food', 'phrase', 5304],
  ['this tastes amazing', 'phrase', 'food', 'phrase', 5305],
  ['more please', 'phrase', 'food', 'phrase', 5306],
  ['enough thank you', 'phrase', 'food', 'phrase', 5307],
  ['i cannot eat meat', 'phrase', 'food', 'phrase', 5308],
  ['i do not eat pork', 'phrase', 'food', 'phrase', 5309],
  ['i only eat halal food', 'phrase', 'food', 'phrase', 5310],
  ['is this vegetarian', 'phrase', 'food', 'phrase', 5311],
  ['without onion please', 'phrase', 'food', 'phrase', 5312],
  ['the food is too salty', 'phrase', 'food', 'phrase', 5313],
  ['the food is cold', 'phrase', 'food', 'phrase', 5314],
  ['can i have warm water', 'phrase', 'food', 'phrase', 5315],
  ['do you have bottled water', 'phrase', 'food', 'phrase', 5316],
  ['do you have green tea', 'phrase', 'food', 'phrase', 5317],
  ['do you have qehwa', 'phrase', 'food', 'phrase', 5318],
  ['bring us chapati', 'phrase', 'food', 'phrase', 5319],
  ['can i eat with my hands', 'phrase', 'food', 'phrase', 5320],
  ['we are sharing', 'phrase', 'food', 'phrase', 5321],
  ['separate bills please', 'phrase', 'food', 'phrase', 5322],
  ['together please', 'phrase', 'food', 'phrase', 5323],
  ['keep the change', 'phrase', 'food', 'phrase', 5324],
  ['do you have a menu', 'phrase', 'food', 'phrase', 5325],
  ['rice with lentils', 'phrase', 'food', 'phrase', 5326],
  ['fried egg', 'phrase', 'food', 'phrase', 5327],
  ['boiled egg', 'phrase', 'food', 'phrase', 5328],
  ['scrambled eggs', 'phrase', 'food', 'phrase', 5329],
  ['chapati with butter', 'phrase', 'food', 'phrase', 5330],
  ['sweet tea', 'phrase', 'food', 'phrase', 5331],
  ['without sugar', 'phrase', 'food', 'phrase', 5332],
  ['extra sugar please', 'phrase', 'food', 'phrase', 5333],

  // ══════════════════════════════════════════════════════════════════
  // ACCOMMODATION (extended)
  // ══════════════════════════════════════════════════════════════════
  ['is there a guesthouse nearby', 'phrase', 'accommodation', 'phrase', 5400],
  ['can i stay the night', 'phrase', 'accommodation', 'phrase', 5401],
  ['how much for one night', 'phrase', 'accommodation', 'phrase', 5402],
  ['how much for one week', 'phrase', 'accommodation', 'phrase', 5403],
  ['is breakfast included', 'phrase', 'accommodation', 'phrase', 5404],
  ['is dinner available', 'phrase', 'accommodation', 'phrase', 5405],
  ['do you have a single room', 'phrase', 'accommodation', 'phrase', 5406],
  ['do you have a double room', 'phrase', 'accommodation', 'phrase', 5407],
  ['can i see the room first', 'phrase', 'accommodation', 'phrase', 5408],
  ['do you have a cheaper room', 'phrase', 'accommodation', 'phrase', 5409],
  ['the room is too small', 'phrase', 'accommodation', 'phrase', 5410],
  ['i want a room with a view', 'phrase', 'accommodation', 'phrase', 5411],
  ['is there hot water in the morning', 'phrase', 'accommodation', 'phrase', 5412],
  ['when is the hot water available', 'phrase', 'accommodation', 'phrase', 5413],
  ['is there electricity at night', 'phrase', 'accommodation', 'phrase', 5414],
  ['can i charge my phone here', 'phrase', 'accommodation', 'phrase', 5415],
  ['is there wifi', 'phrase', 'accommodation', 'phrase', 5416],
  ['what is the wifi password', 'phrase', 'accommodation', 'phrase', 5417],
  ['where is the toilet', 'phrase', 'accommodation', 'phrase', 5418],
  ['is the toilet inside or outside', 'phrase', 'accommodation', 'phrase', 5419],
  ['i need clean towels', 'phrase', 'accommodation', 'phrase', 5420],
  ['can you wake me up at six', 'phrase', 'accommodation', 'phrase', 5421],
  ['i will leave tomorrow morning', 'phrase', 'accommodation', 'phrase', 5422],
  ['can i store my bag here', 'phrase', 'accommodation', 'phrase', 5423],
  ['i lost my key', 'phrase', 'accommodation', 'phrase', 5424],
  ['the lock is broken', 'phrase', 'accommodation', 'phrase', 5425],
  ['there is no water', 'phrase', 'accommodation', 'phrase', 5426],
  ['there is a leak', 'phrase', 'accommodation', 'phrase', 5427],

  // ══════════════════════════════════════════════════════════════════
  // TRANSPORT (extended)
  // ══════════════════════════════════════════════════════════════════
  ['when is the first bus', 'phrase', 'transport', 'phrase', 5500],
  ['when is the last bus', 'phrase', 'transport', 'phrase', 5501],
  ['is there a direct bus', 'phrase', 'transport', 'phrase', 5502],
  ['i need to change bus', 'phrase', 'transport', 'phrase', 5503],
  ['where do i get off', 'phrase', 'transport', 'phrase', 5504],
  ['how many stops to', 'phrase', 'transport', 'phrase', 5505],
  ['tell me when we arrive', 'phrase', 'transport', 'phrase', 5506],
  ['is this seat taken', 'phrase', 'transport', 'phrase', 5507],
  ['can i sit here', 'phrase', 'transport', 'phrase', 5508],
  ['i get motion sickness', 'phrase', 'transport', 'phrase', 5509],
  ['please drive slowly', 'phrase', 'transport', 'phrase', 5510],
  ['the road is rough', 'phrase', 'transport', 'phrase', 5511],
  ['wait for me here', 'phrase', 'transport', 'phrase', 5512],
  ['i will be back in ten minutes', 'phrase', 'transport', 'phrase', 5513],
  ['how much to hire a jeep', 'phrase', 'transport', 'phrase', 5514],
  ['how much per day', 'phrase', 'transport', 'phrase', 5515],
  ['can we share the cost', 'phrase', 'transport', 'phrase', 5516],
  ['i need a horse for the trek', 'phrase', 'transport', 'phrase', 5517],
  ['the horse is tired', 'phrase', 'transport', 'phrase', 5518],
  ['is there a helicopter service', 'phrase', 'transport', 'phrase', 5519],
  ['the flight is cancelled', 'phrase', 'transport', 'phrase', 5520],
  ['i missed my bus', 'phrase', 'transport', 'phrase', 5521],
  ['when is the next one', 'phrase', 'transport', 'phrase', 5522],
  ['my luggage is lost', 'phrase', 'transport', 'phrase', 5523],
  ['my bag is heavy', 'phrase', 'transport', 'phrase', 5524],

  // ══════════════════════════════════════════════════════════════════
  // SHOPPING & BARGAINING
  // ══════════════════════════════════════════════════════════════════
  ['what is your best price', 'phrase', 'shopping', 'phrase', 5600],
  ['i will pay cash', 'phrase', 'shopping', 'phrase', 5601],
  ['do you accept card', 'phrase', 'shopping', 'phrase', 5602],
  ['do you have a smaller size', 'phrase', 'shopping', 'phrase', 5603],
  ['do you have a larger size', 'phrase', 'shopping', 'phrase', 5604],
  ['do you have another color', 'phrase', 'shopping', 'phrase', 5605],
  ['is this handmade', 'phrase', 'shopping', 'phrase', 5606],
  ['is this locally made', 'phrase', 'shopping', 'phrase', 5607],
  ['how long to make this', 'phrase', 'shopping', 'phrase', 5608],
  ['can you make one for me', 'phrase', 'shopping', 'phrase', 5609],
  ['i will think about it', 'phrase', 'shopping', 'phrase', 5610],
  ['i will come back later', 'phrase', 'shopping', 'phrase', 5611],
  ['wrap it please', 'phrase', 'shopping', 'phrase', 5612],
  ['do you have a bag', 'phrase', 'shopping', 'phrase', 5613],
  ['where is the pharmacy', 'phrase', 'shopping', 'phrase', 5614],
  ['do you have painkillers', 'phrase', 'shopping', 'phrase', 5615],
  ['do you have bandages', 'phrase', 'shopping', 'phrase', 5616],
  ['do you have sunscreen', 'phrase', 'shopping', 'phrase', 5617],
  ['do you have a sim card', 'phrase', 'shopping', 'phrase', 5618],
  ['where can i charge my phone', 'phrase', 'shopping', 'phrase', 5619],
  ['do you have a charger', 'phrase', 'shopping', 'phrase', 5620],
  ['where can i get water', 'phrase', 'shopping', 'phrase', 5621],
  ['is this safe to eat', 'phrase', 'shopping', 'phrase', 5622],
  ['is this fresh', 'phrase', 'shopping', 'phrase', 5623],

  // ══════════════════════════════════════════════════════════════════
  // HEALTH & MEDICAL (extended)
  // ══════════════════════════════════════════════════════════════════
  ['i need to see a doctor urgently', 'phrase', 'emergency', 'phrase', 5700],
  ['where is the nearest clinic', 'phrase', 'emergency', 'phrase', 5701],
  ['i have been bitten', 'phrase', 'emergency', 'phrase', 5702],
  ['i have been stung', 'phrase', 'emergency', 'phrase', 5703],
  ['i am having trouble breathing', 'phrase', 'emergency', 'phrase', 5704],
  ['i feel very weak', 'phrase', 'emergency', 'phrase', 5705],
  ['i am vomiting', 'phrase', 'emergency', 'phrase', 5706],
  ['i have a rash', 'phrase', 'emergency', 'phrase', 5707],
  ['my eyes are swollen', 'phrase', 'emergency', 'phrase', 5708],
  ['i twisted my ankle', 'phrase', 'emergency', 'phrase', 5709],
  ['i think i have food poisoning', 'phrase', 'emergency', 'phrase', 5710],
  ['i have been feeling sick since yesterday', 'phrase', 'emergency', 'phrase', 5711],
  ['is there a hospital in this town', 'phrase', 'emergency', 'phrase', 5712],
  ['i need to be evacuated', 'phrase', 'emergency', 'phrase', 5713],
  ['i need oxygen', 'phrase', 'emergency', 'phrase', 5714],
  ['i take daily medication', 'phrase', 'emergency', 'phrase', 5715],
  ['where is my medication', 'phrase', 'emergency', 'phrase', 5716],
  ['i am recovering', 'phrase', 'emergency', 'phrase', 5717],
  ['i need to rest for a day', 'phrase', 'emergency', 'phrase', 5718],
  ['i am feeling better now', 'phrase', 'emergency', 'phrase', 5719],
  ['thank you for your help', 'phrase', 'emergency', 'phrase', 5720],

  // ══════════════════════════════════════════════════════════════════
  // TREKKING & MOUNTAIN TRAVEL (extended)
  // ══════════════════════════════════════════════════════════════════
  ['what is the altitude here', 'phrase', 'trekking', 'phrase', 5800],
  ['i have altitude sickness', 'phrase', 'trekking', 'phrase', 5801],
  ['i need to go lower', 'phrase', 'trekking', 'phrase', 5802],
  ['the pass is closed', 'phrase', 'trekking', 'phrase', 5803],
  ['when does the pass open', 'phrase', 'trekking', 'phrase', 5804],
  ['how deep is the snow', 'phrase', 'trekking', 'phrase', 5805],
  ['is it safe to cross', 'phrase', 'trekking', 'phrase', 5806],
  ['the river is high', 'phrase', 'trekking', 'phrase', 5807],
  ['can we ford the river', 'phrase', 'trekking', 'phrase', 5808],
  ['where is base camp', 'phrase', 'trekking', 'phrase', 5809],
  ['how many hours to the top', 'phrase', 'trekking', 'phrase', 5810],
  ['what is the name of that mountain', 'phrase', 'trekking', 'phrase', 5811],
  ['how high is that peak', 'phrase', 'trekking', 'phrase', 5812],
  ['i want to see the glacier', 'phrase', 'trekking', 'phrase', 5813],
  ['where does this trail lead', 'phrase', 'trekking', 'phrase', 5814],
  ['is there drinking water on the trail', 'phrase', 'trekking', 'phrase', 5815],
  ['where can we camp tonight', 'phrase', 'trekking', 'phrase', 5816],
  ['is there a flat spot to pitch a tent', 'phrase', 'trekking', 'phrase', 5817],
  ['can we make a fire here', 'phrase', 'trekking', 'phrase', 5818],
  ['i need firewood', 'phrase', 'trekking', 'phrase', 5819],
  ['the weather is changing', 'phrase', 'trekking', 'phrase', 5820],
  ['we should turn back', 'phrase', 'trekking', 'phrase', 5821],
  ['storm is coming', 'phrase', 'trekking', 'phrase', 5822],
  ['it will snow tonight', 'phrase', 'trekking', 'phrase', 5823],
  ['we need shelter', 'phrase', 'trekking', 'phrase', 5824],
  ['my trekking pole is broken', 'phrase', 'trekking', 'phrase', 5825],
  ['i have a blister', 'phrase', 'trekking', 'phrase', 5826],
  ['my boots are wet', 'phrase', 'trekking', 'phrase', 5827],
  ['i need to dry my clothes', 'phrase', 'trekking', 'phrase', 5828],
  ['this view is incredible', 'phrase', 'trekking', 'phrase', 5829],

  // ══════════════════════════════════════════════════════════════════
  // CULTURE & CUSTOMS
  // ══════════════════════════════════════════════════════════════════
  ['what is this festival called', 'phrase', 'culture', 'phrase', 5900],
  ['when is the festival', 'phrase', 'culture', 'phrase', 5901],
  ['can i attend the celebration', 'phrase', 'culture', 'phrase', 5902],
  ['what should i wear', 'phrase', 'culture', 'phrase', 5903],
  ['should i cover my head', 'phrase', 'culture', 'phrase', 5904],
  ['should i remove my shoes', 'phrase', 'culture', 'phrase', 5905],
  ['is photography allowed', 'phrase', 'culture', 'phrase', 5906],
  ['may i take your photo', 'phrase', 'culture', 'phrase', 5907],
  ['thank you for letting me visit', 'phrase', 'culture', 'phrase', 5908],
  ['your hospitality is wonderful', 'phrase', 'culture', 'phrase', 5909],
  ['i want to learn about your traditions', 'phrase', 'culture', 'phrase', 5910],
  ['what instrument is that', 'phrase', 'culture', 'phrase', 5911],
  ['can you teach me a few words', 'phrase', 'culture', 'phrase', 5912],
  ['how do you say this in your language', 'phrase', 'culture', 'phrase', 5913],
  ['what does this symbol mean', 'phrase', 'culture', 'phrase', 5914],
  ['what is this embroidery called', 'phrase', 'culture', 'phrase', 5915],
  ['where was this made', 'phrase', 'culture', 'phrase', 5916],
  ['how old is this building', 'phrase', 'culture', 'phrase', 5917],
  ['what is the history of this place', 'phrase', 'culture', 'phrase', 5918],
  ['is this a sacred place', 'phrase', 'culture', 'phrase', 5919],

  // ══════════════════════════════════════════════════════════════════
  // NATURE & ENVIRONMENT (extended)
  // ══════════════════════════════════════════════════════════════════
  ['what is the name of this mountain', 'phrase', 'nature', 'phrase', 6000],
  ['what is the name of this river', 'phrase', 'nature', 'phrase', 6001],
  ['what is the name of this valley', 'phrase', 'nature', 'phrase', 6002],
  ['what kind of tree is this', 'phrase', 'nature', 'phrase', 6003],
  ['what kind of bird is that', 'phrase', 'nature', 'phrase', 6004],
  ['are there snow leopards here', 'phrase', 'nature', 'phrase', 6005],
  ['are there bears in this area', 'phrase', 'nature', 'phrase', 6006],
  ['is this water clean to drink', 'phrase', 'nature', 'phrase', 6007],
  ['where does this river come from', 'phrase', 'nature', 'phrase', 6008],
  ['how deep is this lake', 'phrase', 'nature', 'phrase', 6009],
  ['when does the snow melt', 'phrase', 'nature', 'phrase', 6010],
  ['the glacier is melting', 'phrase', 'nature', 'phrase', 6011],
  ['the harvest season', 'phrase', 'nature', 'phrase', 6012],
  ['when is the apricot season', 'phrase', 'nature', 'phrase', 6013],
  ['when is the apple harvest', 'phrase', 'nature', 'phrase', 6014],
  ['the orchard is beautiful', 'phrase', 'nature', 'phrase', 6015],
  ['fresh spring water', 'phrase', 'nature', 'phrase', 6016],
  ['the water is cold from the glacier', 'phrase', 'nature', 'phrase', 6017],
  ['there is a landslide on the road', 'phrase', 'nature', 'phrase', 6018],
  ['the flood took the bridge', 'phrase', 'nature', 'phrase', 6019],
  ['slope', 'noun', 'nature', 'word', 6020],
  ['gorge', 'noun', 'nature', 'word', 6021],
  ['plateau', 'noun', 'nature', 'word', 6022],
  ['ravine', 'noun', 'nature', 'word', 6023],
  ['moraine', 'noun', 'nature', 'word', 6024],
  ['avalanche zone', 'phrase', 'nature', 'phrase', 6025],
  ['snowfield', 'noun', 'nature', 'word', 6026],
  ['crevasse', 'noun', 'nature', 'word', 6027],
  ['pine tree', 'phrase', 'nature', 'phrase', 6028],
  ['willow tree', 'phrase', 'nature', 'phrase', 6029],
  ['apricot tree', 'phrase', 'nature', 'phrase', 6030],
  ['walnut tree', 'phrase', 'nature', 'phrase', 6031],
  ['mulberry tree', 'phrase', 'nature', 'phrase', 6032],

  // ══════════════════════════════════════════════════════════════════
  // FAMILY & SOCIAL LIFE (extended)
  // ══════════════════════════════════════════════════════════════════
  ['how many people in your family', 'phrase', 'family', 'phrase', 6100],
  ['do you live with your parents', 'phrase', 'family', 'phrase', 6101],
  ['are your parents well', 'phrase', 'family', 'phrase', 6102],
  ['my father is a farmer', 'phrase', 'family', 'phrase', 6103],
  ['my mother is a teacher', 'phrase', 'family', 'phrase', 6104],
  ['i have two brothers', 'phrase', 'family', 'phrase', 6105],
  ['i have three sisters', 'phrase', 'family', 'phrase', 'phrase'],
  ['i am the eldest', 'phrase', 'family', 'phrase', 6107],
  ['i am the youngest', 'phrase', 'family', 'phrase', 6108],
  ['we are cousins', 'phrase', 'family', 'phrase', 6109],
  ['this is my husband', 'phrase', 'family', 'phrase', 6110],
  ['this is my wife', 'phrase', 'family', 'phrase', 6111],
  ['these are my children', 'phrase', 'family', 'phrase', 6112],
  ['my son is ten years old', 'phrase', 'family', 'phrase', 6113],
  ['my daughter is studying', 'phrase', 'family', 'phrase', 6114],
  ['we are from the same village', 'phrase', 'family', 'phrase', 6115],
  ['we are neighbors', 'phrase', 'family', 'phrase', 6116],
  ['an old friend', 'phrase', 'family', 'phrase', 6117],
  ['a close friend', 'phrase', 'family', 'phrase', 6118],
  ['a childhood friend', 'phrase', 'family', 'phrase', 6119],

  // ══════════════════════════════════════════════════════════════════
  // RELIGION & SPIRITUAL LIFE
  // ══════════════════════════════════════════════════════════════════
  ['is this a mosque', 'phrase', 'religion', 'phrase', 6200],
  ['is this a shrine', 'phrase', 'religion', 'phrase', 6201],
  ['when is prayer time', 'phrase', 'religion', 'phrase', 6202],
  ['the call to prayer', 'phrase', 'religion', 'phrase', 6203],
  ['i am fasting', 'phrase', 'religion', 'phrase', 6204],
  ['are you fasting', 'phrase', 'religion', 'phrase', 6205],
  ['it is ramadan', 'phrase', 'religion', 'phrase', 6206],
  ['eid mubarak', 'phrase', 'religion', 'phrase', 6207],
  ['friday prayers', 'phrase', 'religion', 'phrase', 6208],
  ['i respect your religion', 'phrase', 'religion', 'phrase', 6209],
  ['i am a muslim', 'phrase', 'religion', 'phrase', 6210],
  ['i am a christian', 'phrase', 'religion', 'phrase', 6211],
  ['i am not religious', 'phrase', 'religion', 'phrase', 6212],
  ['we all believe in god', 'phrase', 'religion', 'phrase', 6213],
  ['may god protect you', 'phrase', 'religion', 'phrase', 6214],
  ['inshallah', 'phrase', 'religion', 'word', 6215],
  ['alhamdulillah', 'phrase', 'religion', 'word', 6216],
  ['mashallah', 'phrase', 'religion', 'word', 6217],
  ['bismillah', 'phrase', 'religion', 'word', 6218],
  ['the saint', 'noun', 'religion', 'word', 6219],
  ['pilgrimage', 'noun', 'religion', 'word', 6220],

  // ══════════════════════════════════════════════════════════════════
  // TIME & PLANNING
  // ══════════════════════════════════════════════════════════════════
  ['i am in a hurry', 'phrase', 'time', 'phrase', 6300],
  ['i have time', 'phrase', 'time', 'phrase', 6301],
  ['i do not have much time', 'phrase', 'time', 'phrase', 6302],
  ['we should leave now', 'phrase', 'time', 'phrase', 6303],
  ['we should leave early', 'phrase', 'time', 'phrase', 6304],
  ['let us meet at sunrise', 'phrase', 'time', 'phrase', 6305],
  ['let us meet at noon', 'phrase', 'time', 'phrase', 6306],
  ['let us meet in the evening', 'phrase', 'time', 'phrase', 6307],
  ['i will arrive in two hours', 'phrase', 'time', 'phrase', 6308],
  ['the journey takes three days', 'phrase', 'time', 'phrase', 6309],
  ['i have been here for one week', 'phrase', 'time', 'phrase', 6310],
  ['i am leaving in two days', 'phrase', 'time', 'phrase', 6311],
  ['i arrived this morning', 'phrase', 'time', 'phrase', 6312],
  ['i arrived last night', 'phrase', 'time', 'phrase', 6313],
  ['a long time ago', 'phrase', 'time', 'phrase', 6314],
  ['recently', 'adverb', 'time', 'word', 6315],
  ['always', 'adverb', 'time', 'word', 6316],
  ['sometimes', 'adverb', 'time', 'word', 6317],
  ['never', 'adverb', 'time', 'word', 6318],
  ['every day', 'phrase', 'time', 'phrase', 6319],
  ['once a week', 'phrase', 'time', 'phrase', 6320],
  ['every morning', 'phrase', 'time', 'phrase', 6321],
  ['last year', 'phrase', 'time', 'phrase', 6322],
  ['next year', 'phrase', 'time', 'phrase', 6323],
  ['a few days ago', 'phrase', 'time', 'phrase', 6324],

  // ══════════════════════════════════════════════════════════════════
  // EMOTIONS & FEELINGS
  // ══════════════════════════════════════════════════════════════════
  ['i am happy', 'phrase', 'emotions', 'phrase', 6400],
  ['i am sad', 'phrase', 'emotions', 'phrase', 6401],
  ['i am worried', 'phrase', 'emotions', 'phrase', 6402],
  ['i am scared', 'phrase', 'emotions', 'phrase', 6403],
  ['i am excited', 'phrase', 'emotions', 'phrase', 6404],
  ['i am grateful', 'phrase', 'emotions', 'phrase', 6405],
  ['i am surprised', 'phrase', 'emotions', 'phrase', 6406],
  ['i am angry', 'phrase', 'emotions', 'phrase', 6407],
  ['i am confused', 'phrase', 'emotions', 'phrase', 6408],
  ['i am calm', 'phrase', 'emotions', 'phrase', 6409],
  ['i feel at peace here', 'phrase', 'emotions', 'phrase', 6410],
  ['i feel at home', 'phrase', 'emotions', 'phrase', 6411],
  ['this makes me happy', 'phrase', 'emotions', 'phrase', 6412],
  ['this is beautiful', 'phrase', 'emotions', 'phrase', 6413],
  ['i am moved', 'phrase', 'emotions', 'phrase', 6414],
  ['what a great memory', 'phrase', 'emotions', 'phrase', 6415],
  ['love', 'noun', 'emotions', 'word', 6416],
  ['joy', 'noun', 'emotions', 'word', 6417],
  ['sorrow', 'noun', 'emotions', 'word', 6418],
  ['fear', 'noun', 'emotions', 'word', 6419],
  ['hope', 'noun', 'emotions', 'word', 6420],
  ['peace', 'noun', 'emotions', 'word', 6421],
  ['patience', 'noun', 'emotions', 'word', 6422],
  ['courage', 'noun', 'emotions', 'word', 6423],
  ['trust', 'noun', 'emotions', 'word', 6424],
  ['respect', 'noun', 'emotions', 'word', 6425],
  ['pride', 'noun', 'emotions', 'word', 6426],
  ['shame', 'noun', 'emotions', 'word', 6427],
  ['kindness', 'noun', 'emotions', 'word', 6428],
  ['generosity', 'noun', 'emotions', 'word', 6429],

  // ══════════════════════════════════════════════════════════════════
  // BODY & HEALTH VOCABULARY (extended)
  // ══════════════════════════════════════════════════════════════════
  ['right hand', 'phrase', 'body', 'phrase', 6500],
  ['left hand', 'phrase', 'body', 'phrase', 6501],
  ['right leg', 'phrase', 'body', 'phrase', 6502],
  ['left leg', 'phrase', 'body', 'phrase', 6503],
  ['upper back', 'phrase', 'body', 'phrase', 6504],
  ['lower back', 'phrase', 'body', 'phrase', 6505],
  ['swollen', 'adjective', 'body', 'word', 6506],
  ['infected', 'adjective', 'body', 'word', 6507],
  ['numb', 'adjective', 'body', 'word', 6508],
  ['burning sensation', 'phrase', 'body', 'phrase', 6509],
  ['sharp pain', 'phrase', 'body', 'phrase', 6510],
  ['dull pain', 'phrase', 'body', 'phrase', 6511],
  ['the pain is here', 'phrase', 'body', 'phrase', 6512],
  ['the pain comes and goes', 'phrase', 'body', 'phrase', 6513],
  ['i have been sick for two days', 'phrase', 'body', 'phrase', 6514],
  ['i cannot eat', 'phrase', 'body', 'phrase', 6515],
  ['i cannot sleep', 'phrase', 'body', 'phrase', 6516],
  ['i have a high fever', 'phrase', 'body', 'phrase', 6517],
  ['i need antibiotics', 'phrase', 'body', 'phrase', 6518],
  ['i am pregnant', 'phrase', 'body', 'phrase', 6519],
  ['i have a heart condition', 'phrase', 'body', 'phrase', 6520],
  ['i have asthma', 'phrase', 'body', 'phrase', 6521],
  ['i am recovering from surgery', 'phrase', 'body', 'phrase', 6522],

  // ══════════════════════════════════════════════════════════════════
  // DAILY ACTIVITIES
  // ══════════════════════════════════════════════════════════════════
  ['wake up early', 'phrase', 'daily', 'phrase', 6600],
  ['go to sleep', 'phrase', 'daily', 'phrase', 6601],
  ['take a bath', 'phrase', 'daily', 'phrase', 6602],
  ['wash your hands', 'phrase', 'daily', 'phrase', 6603],
  ['brush your teeth', 'phrase', 'daily', 'phrase', 6604],
  ['get dressed', 'phrase', 'daily', 'phrase', 6605],
  ['cook breakfast', 'phrase', 'daily', 'phrase', 6606],
  ['do the dishes', 'phrase', 'daily', 'phrase', 6607],
  ['sweep the floor', 'phrase', 'daily', 'phrase', 6608],
  ['carry water', 'phrase', 'daily', 'phrase', 6609],
  ['fetch firewood', 'phrase', 'daily', 'phrase', 6610],
  ['light the fire', 'phrase', 'daily', 'phrase', 6611],
  ['milk the cow', 'phrase', 'daily', 'phrase', 6612],
  ['feed the animals', 'phrase', 'daily', 'phrase', 6613],
  ['go to the market', 'phrase', 'daily', 'phrase', 6614],
  ['go to the fields', 'phrase', 'daily', 'phrase', 6615],
  ['water the crops', 'phrase', 'daily', 'phrase', 6616],
  ['pick the fruit', 'phrase', 'daily', 'phrase', 6617],
  ['grind the wheat', 'phrase', 'daily', 'phrase', 6618],
  ['bake bread', 'phrase', 'daily', 'phrase', 6619],
  ['knit', 'verb', 'daily', 'word', 6620],
  ['weave', 'verb', 'daily', 'word', 6621],
  ['sew', 'verb', 'daily', 'word', 6622],
  ['repair', 'verb', 'daily', 'word', 6623],
  ['build', 'verb', 'daily', 'word', 6624],
  ['plant', 'verb', 'daily', 'word', 6625],
  ['harvest', 'verb', 'daily', 'word', 6626],
  ['graze', 'verb', 'daily', 'word', 6627],
  ['herd', 'verb', 'daily', 'word', 6628],
  ['trade', 'verb', 'daily', 'word', 6629],

  // ══════════════════════════════════════════════════════════════════
  // PLACES & LANDMARKS
  // ══════════════════════════════════════════════════════════════════
  ['ancient fort', 'phrase', 'places', 'phrase', 6700],
  ['historical site', 'phrase', 'places', 'phrase', 6701],
  ['ruins', 'noun', 'places', 'word', 6702],
  ['museum', 'noun', 'places', 'word', 6703],
  ['viewpoint', 'noun', 'places', 'word', 6704],
  ['lookout', 'noun', 'places', 'word', 6705],
  ['hot spring', 'phrase', 'places', 'phrase', 6706],
  ['cave', 'noun', 'places', 'word', 6707],
  ['waterfall nearby', 'phrase', 'places', 'phrase', 6708],
  ['the old part of the town', 'phrase', 'places', 'phrase', 6709],
  ['community center', 'phrase', 'places', 'phrase', 6710],
  ['meeting place', 'phrase', 'places', 'phrase', 6711],
  ['gathering spot', 'phrase', 'places', 'phrase', 6712],
  ['playground', 'noun', 'places', 'word', 6713],
  ['graveyard', 'noun', 'places', 'word', 6714],
  ['cemetery', 'noun', 'places', 'word', 6715],
  ['the central square', 'phrase', 'places', 'phrase', 6716],
  ['the village elder', 'phrase', 'places', 'phrase', 6717],
  ['the village head', 'phrase', 'places', 'phrase', 6718],
  ['the chief', 'phrase', 'places', 'phrase', 6719],
  ['the water source', 'phrase', 'places', 'phrase', 6720],
  ['the irrigation channel', 'phrase', 'places', 'phrase', 6721],
  ['the grazing land', 'phrase', 'places', 'phrase', 6722],
  ['the summer camp', 'phrase', 'places', 'phrase', 6723],

  // ══════════════════════════════════════════════════════════════════
  // EDUCATION & LEARNING
  // ══════════════════════════════════════════════════════════════════
  ['school', 'noun', 'education', 'word', 6800],
  ['university', 'noun', 'education', 'word', 6801],
  ['teacher', 'noun', 'education', 'word', 6802],
  ['student', 'noun', 'education', 'word', 6803],
  ['book', 'noun', 'education', 'word', 6804],
  ['pen', 'noun', 'education', 'word', 6805],
  ['notebook', 'noun', 'education', 'word', 6806],
  ['class', 'noun', 'education', 'word', 6807],
  ['lesson', 'noun', 'education', 'word', 6808],
  ['homework', 'noun', 'education', 'word', 6809],
  ['exam', 'noun', 'education', 'word', 6810],
  ['read', 'verb', 'education', 'word', 6811],
  ['write', 'verb', 'education', 'word', 6812],
  ['study', 'verb', 'education', 'word', 6813],
  ['learn', 'verb', 'education', 'word', 6814],
  ['teach', 'verb', 'education', 'word', 6815],
  ['speak', 'verb', 'education', 'word', 6816],
  ['listen', 'verb', 'education', 'word', 6817],
  ['practice', 'verb', 'education', 'word', 6818],
  ['understand', 'verb', 'education', 'word', 6819],
  ['i am learning your language', 'phrase', 'education', 'phrase', 6820],
  ['education is important', 'phrase', 'education', 'phrase', 6821],
  ['children should go to school', 'phrase', 'education', 'phrase', 6822],
  ['knowledge', 'noun', 'education', 'word', 6823],
  ['language', 'noun', 'education', 'word', 6824],
  ['mother tongue', 'phrase', 'education', 'phrase', 6825],
  ['local language', 'phrase', 'education', 'phrase', 6826],
  ['our language is important', 'phrase', 'education', 'phrase', 6827],
  ['do not let the language die', 'phrase', 'education', 'phrase', 6828],
  ['we must preserve our language', 'phrase', 'education', 'phrase', 6829],

  // ══════════════════════════════════════════════════════════════════
  // WORK & LIVELIHOOD
  // ══════════════════════════════════════════════════════════════════
  ['farmer', 'noun', 'work', 'word', 6900],
  ['shepherd', 'noun', 'work', 'word', 6901],
  ['teacher', 'noun', 'work', 'word', 6902],
  ['doctor', 'noun', 'work', 'word', 6903],
  ['nurse', 'noun', 'work', 'word', 6904],
  ['soldier', 'noun', 'work', 'word', 6905],
  ['police officer', 'phrase', 'work', 'phrase', 6906],
  ['government worker', 'phrase', 'work', 'phrase', 6907],
  ['carpenter', 'noun', 'work', 'word', 6908],
  ['blacksmith', 'noun', 'work', 'word', 6909],
  ['tailor', 'noun', 'work', 'word', 6910],
  ['weaver', 'noun', 'work', 'word', 6911],
  ['potter', 'noun', 'work', 'word', 6912],
  ['cook', 'noun', 'work', 'word', 6913],
  ['shopkeeper', 'noun', 'work', 'word', 6914],
  ['trader', 'noun', 'work', 'word', 6915],
  ['guide', 'noun', 'work', 'word', 6916],
  ['porter', 'noun', 'work', 'word', 6917],
  ['driver', 'noun', 'work', 'word', 6918],
  ['laborer', 'noun', 'work', 'word', 6919],
  ['craftsman', 'noun', 'work', 'word', 6920],
  ['musician', 'noun', 'work', 'word', 6921],
  ['poet', 'noun', 'work', 'word', 6922],
  ['storyteller', 'noun', 'work', 'word', 6923],
  ['healer', 'noun', 'work', 'word', 6924],
  ['midwife', 'noun', 'work', 'word', 6925],
  ['prayer leader', 'phrase', 'work', 'phrase', 6926],
  ['religious scholar', 'phrase', 'work', 'phrase', 6927],
  ['i work hard', 'phrase', 'work', 'phrase', 6928],
  ['work is prayer', 'phrase', 'work', 'phrase', 6929],

  // ══════════════════════════════════════════════════════════════════
  // COMMON OBJECTS
  // ══════════════════════════════════════════════════════════════════
  ['mobile phone', 'phrase', 'objects', 'phrase', 7000],
  ['charger', 'noun', 'objects', 'word', 7001],
  ['battery', 'noun', 'objects', 'word', 7002],
  ['camera', 'noun', 'objects', 'word', 7003],
  ['photograph', 'noun', 'objects', 'word', 7004],
  ['map', 'noun', 'objects', 'word', 7005],
  ['compass', 'noun', 'objects', 'word', 7006],
  ['watch', 'noun', 'objects', 'word', 7007],
  ['money wallet', 'phrase', 'objects', 'phrase', 7008],
  ['passport', 'noun', 'objects', 'word', 7009],
  ['pen', 'noun', 'objects', 'word', 7010],
  ['paper', 'noun', 'objects', 'word', 7011],
  ['torch', 'noun', 'objects', 'word', 7012],
  ['matches', 'noun', 'objects', 'word', 7013],
  ['lighter', 'noun', 'objects', 'word', 7014],
  ['knife', 'noun', 'objects', 'word', 7015],
  ['stick', 'noun', 'objects', 'word', 7016],
  ['rope', 'noun', 'objects', 'word', 7017],
  ['tarp', 'noun', 'objects', 'word', 7018],
  ['first aid kit', 'phrase', 'objects', 'phrase', 7019],
  ['water filter', 'phrase', 'objects', 'phrase', 7020],
  ['sunglasses', 'noun', 'objects', 'word', 7021],
  ['umbrella', 'noun', 'objects', 'word', 7022],
  ['walking stick', 'phrase', 'objects', 'phrase', 7023],
  ['sleeping mat', 'phrase', 'objects', 'phrase', 7024],

];

// ── Upload ────────────────────────────────────────────────────────────────────

async function main() {
  // Fetch all existing IDs (paginated)
  const PAGE = 1000;
  let existingIds = new Set();
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from('lexicon_entries').select('id').range(from, from + PAGE - 1);
    if (error) { console.error('Fetch error:', error.message); process.exit(1); }
    data.forEach(r => existingIds.add(r.id));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  console.log(`Existing entries: ${existingIds.size}`);

  const entries = [];
  const seen    = new Set();

  for (const item of RAW) {
    const [en, pos, category, type, rank] = item;
    if (typeof rank !== 'number') continue; // skip malformed rows
    const id = slug(en);
    if (existingIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    entries.push({ id, type, pos, category, canonical_en: en.toLowerCase(), frequency_rank: rank });
  }

  console.log(`New entries to add: ${entries.length}`);
  if (entries.length === 0) { console.log('Nothing to add.'); return; }

  let inserted = 0;
  for (let i = 0; i < entries.length; i += 100) {
    const batch = entries.slice(i, i + 100);
    const { error } = await supabase.from('lexicon_entries').upsert(batch, { onConflict: 'id' });
    if (error) { console.error(`Batch ${i} error:`, error.message); process.exit(1); }
    inserted += batch.length;
    process.stdout.write(`\r  Inserted ${inserted}/${entries.length}...`);
  }

  console.log(`\n\nDone. Added ${entries.length} entries. Total now: ~${existingIds.size + entries.length}`);
}

main().catch(console.error);
