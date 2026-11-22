// Справочники Meydan: вузы, районы, площадки по умолчанию
const UNIS=[
 ["unec","UNEC — İqtisad Universiteti"],["bdu","BDU — Bakı Dövlət Universiteti"],["aztu","AzTU — Texniki Universitet"],
 ["adnsu","ADNSU — Neft və Sənaye Universiteti"],["adpu","ADPU — Pedaqoji Universitet"],["atu","ATU — Tibb Universiteti"],
 ["adu","ADU — Dillər Universiteti"],["azmiu","AzMİU — Memarlıq və İnşaat"],["wcu","WCU — Qərbi Kaspi Universiteti"],
 ["xezer","Xəzər Universiteti"],["ada","ADA Universiteti"],["bmu","BMU — Bakı Mühəndislik Universiteti"],["bhos","BANM — Bakı Ali Neft Məktəbi"],
 ["bsu","BSU — Slavyan Universiteti"],["au","Azərbaycan Universiteti"],["oyu","Odlar Yurdu Universiteti"],["maa","MAA — Milli Aviasiya Akademiyası"],
 ["adiu","ADİU — Bədən Tərbiyəsi və İdman Akademiyası"],["amu","AMU — Azərbaycan Musiqi Akademiyası"],["adma","ADMA — Dövlət Mədəniyyət və İncəsənət Universiteti"],
 ["sdu","SDU — Sumqayıt Dövlət Universiteti"],["gdu","GDU — Gəncə Dövlət Universiteti"],["adau","ADAU — Aqrar Universitet"],["ndu","NDU — Naxçıvan Dövlət Universiteti"],
 ["other","Başqa universitet"]
];
const DISTRICTS=["Binəqədi","Qaradağ","Xətai","Xəzər","Nərimanov","Nəsimi","Nizami","Pirallahı","Sabunçu","Səbail","Suraxanı","Yasamal","Abşeron","Sumqayıt","Gəncə","Başqa"];
const FORMATS=[5,6,7,8,11];
const COURSES=["1","2","3","4","5","6","mag","grad"];
const POSITIONS=["gk","def","mid","fwd","any"];
const LEVELS=["1","2","3"];
// Встроенные площадки: только общеизвестные места; точные адреса и цены студенты добавляют сами
const PITCHES0=[
 {id:"azfar",name:"Azfar mini-futbol meydançaları",district:"Bakı və Sumqayıt",map:"https://www.google.com/maps/search/?api=1&query=Azfar+mini+futbol+Bak%C4%B1",note:"Bakı və Sumqayıtda çoxlu filial — konkret filialı oyunda qeyd et"},
 {id:"tofiq",name:"Tofiq Bəhramov stadionu ətrafı mini-meydançalar",district:"Bakı",map:"https://www.google.com/maps/search/?api=1&query=Tofiq+B%C9%99hramov+stadionu",note:""},
 {id:"uni",name:"Universitetin öz idman zalı / meydançası",district:"",map:"",note:"Öz vuzunun meydançasında oynayırsansa bunu seç və qeyddə yaz"}
];
