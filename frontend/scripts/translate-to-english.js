const fs = require('fs');
const path = require('path');

const mk = JSON.parse(fs.readFileSync(path.join(__dirname, '../lib/locales/mk.json'), 'utf8'));

const translationMap = {
  'Бензин': 'Petrol',
  'Дизел': 'Diesel',
  'Електричен': 'Electric',
  'Хибриден': 'Hybrid',
  'Мануелна': 'Manual',
  'Автоматска': 'Automatic',
  'Варијатор': 'CVT',
  'Преден': 'Front Wheel Drive',
  'Заден': 'Rear Wheel Drive',
  'Полн': 'All Wheel Drive',
  'Седан': 'Sedan',
  'Хечбек': 'Hatchback',
  'Караван': 'Wagon',
  'Кабриолет': 'Convertible',
  'Фургон': 'Van',
  'Пикап': 'Pickup',
  'Миниван': 'Minivan',
  'Камион': 'Truck',
  '2 врати': '2 doors',
  '3 врати': '3 doors',
  '4 врати': '4 doors',
  '5 врати': '5 doors',
  'Број на врати': 'Number of doors',
  'Без оштетувања': 'Undamaged',
  'Со оштетувања': 'Damaged',
  'За делови': 'For Parts',
  'Црна': 'Black',
  'Бела': 'White',
  'Сива': 'Gray',
  'Сребрена': 'Silver',
  'Сина': 'Blue',
  'Црвена': 'Red',
  'Зелена': 'Green',
  'Жолта': 'Yellow',
  'Кафена': 'Brown',
  'Портокалова': 'Orange',
  'Розова': 'Pink',
  'Виолетова': 'Violet',
  'Бежова': 'Beige',
  'Златна': 'Gold',
  'Бронзена': 'Bronze',
  'Темносина': 'Dark Blue',
  'Светлосина': 'Light Blue',
  'Темносива': 'Dark Gray',
  'Светлосива': 'Light Gray',
  'Металик црна': 'Metallic Black',
  'Металик бела': 'Metallic White',
  'Металик сива': 'Metallic Gray',
  'Металик сребрена': 'Metallic Silver',
  'Металик сина': 'Metallic Blue',
  'Металик црвена': 'Metallic Red',
  'Перла': 'Pearl',
  'Металик перла': 'Metallic Pearl',
  'Матирана црна': 'Matte Black',
  'Матирана сива': 'Matte Gray',
  'Матирана сина': 'Matte Blue',
  'Клима уред': 'Air Conditioning',
  'Кожни седишта': 'Leather Seats',
  'Сунце покрив': 'Sunroof',
  'Навигација': 'Navigation',
  'Паркинг сензори': 'Parking Sensors',
  'Задна камера': 'Rear Camera',
  'Круиз контрола': 'Cruise Control',
  'Загреани седишта': 'Heated Seats',
  'Ксенон светла': 'Xenon Lights',
  'LED светла': 'LED Lights',
  'Магли светла': 'Fog Lights',
  'Алуминиумски тркала': 'Alloy Wheels',
  'Електрични прозорци': 'Electric Windows',
  'Централно заклучување': 'Central Locking',
  'USB порт': 'USB Port',
  'Мултифункционален волањ': 'Multifunction Steering Wheel',
  'Start-Stop систем': 'Start-Stop System',
  'ESP систем': 'ESP System',
  'ABS систем': 'ABS System',
  'Почетна': 'Home'
};

function translateValue(value) {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const result = {};
    for (const key in value) {
      result[key] = translateValue(value[key]);
    }
    return result;
  }
  
  if (typeof value !== 'string') return value;
  
  if (translationMap[value]) {
    return translationMap[value];
  }
  
  return value;
}

const en = translateValue(mk);
fs.writeFileSync(path.join(__dirname, '../lib/locales/en.json'), JSON.stringify(en, null, 2));
console.log('English translation file created');
