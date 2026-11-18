import type { Place } from './model'

type City = Place & {description: string; code?: string}
const destinations: [string, string, number, number, string?][] = [
  ["Lisbon","Portugal",-9.1393,38.7223,"LIS"],
  ["Barcelona","Spain",2.1734,41.3851,"BCN"],
  ["Tokyo","Japan",139.6917,35.6895,"TYO"],
  ["New York","United States",-74.006,40.7128,"NYC"],
  ["Cape Town","South Africa",18.4241,-33.9249,"CPT"],
  ["Paris","France",2.3522,48.8566,"PAR"],
  ["Buenos Aires","Argentina",-58.3816,-34.6037,"BUE"],
  ["Sydney","Australia",151.2093,-33.8688,"SYD"],
  ["London","United Kingdom",-0.1278,51.5074,"LON"],
  ["Bangkok","Thailand",100.5018,13.7563,"BKK"],
  ["Mexico City","Mexico",-99.1332,19.4326,"MEX"],
  ["Rome","Italy",12.4964,41.9028,"ROM"],
  ["Nairobi","Kenya",36.8219,-1.2921,"NBO"],
  ["Seoul","South Korea",126.978,37.5665,"SEL"],
  ["Rio de Janeiro","Brazil",-43.1729,-22.9068,"RIO"],
  ["Madrid","Spain",-3.7038,40.4168,"MAD"],
  ["Porto","Portugal",-8.6291,41.1579,"OPO"],
  ["Coimbra","Portugal",-8.4292,40.2033,"COI"],
  ["Kyoto","Japan",135.7681,35.0116],
  ["Delhi","India",77.209,28.6139],
  ["Mumbai","India",72.8777,19.076],
  ["Singapore","Singapore",103.8198,1.3521],
  ["Istanbul","Türkiye",28.9784,41.0082],
  ["Berlin","Germany",13.405,52.52],
  ["Vienna","Austria",16.3738,48.2082],
  ["Amsterdam","Netherlands",4.9041,52.3676],
  ["Prague","Czechia",14.4378,50.0755],
  ["Athens","Greece",23.7275,37.9838],
  ["Montréal","Canada",-73.5673,45.5017],
  ["Vancouver","Canada",-123.1207,49.2827],
  ["Philadelphia","United States",-75.1652,39.9526],
  ["San Francisco","United States",-122.4194,37.7749],
  ["São Paulo","Brazil",-46.6333,-23.5505],
  ["Lima","Peru",-77.0428,-12.0464],
  ["Bogotá","Colombia",-74.0721,4.711],
  ["Marrakesh","Morocco",-7.9811,31.6295],
  ["Cairo","Egypt",31.2357,30.0444],
  ["Accra","Ghana",-0.187,5.6037],
  ["Auckland","New Zealand",174.7633,-36.8485],
  ["Melbourne","Australia",144.9631,-37.8136],
  ["Beijing","China",116.4074,39.9042],
  ["Shanghai","China",121.4737,31.2304],
  ["Hanoi","Vietnam",105.8342,21.0278],
  ["Jakarta","Indonesia",106.8456,-6.2088],
]

export const cities: City[] = destinations.map(([name, description, lng, lat, code]) => ({name, description, lng, lat, code}))

function normalize(text: string) {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

export function filterCities(query: string) {
  const text = normalize(query.trim())
  return cities.filter(city => normalize(city.name + ' ' + city.description).includes(text))
}
