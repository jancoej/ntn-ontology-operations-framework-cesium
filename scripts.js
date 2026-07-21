const viewer = new Cesium.Viewer("cesiumContainer", {
  animation:false,
  timeline:false,
  geocoder:false,
  homeButton:true,
  sceneModePicker:false,
  navigationHelpButton:false,
  fullscreenButton:true,
  baseLayerPicker:true,
  infoBox:false,
  selectionIndicator:false
});

viewer.scene.backgroundColor = Cesium.Color.BLACK;
viewer.scene.globe.show = true;
viewer.scene.globe.baseColor = Cesium.Color.DARKSLATEBLUE;
viewer.scene.globe.enableLighting = true;

const LEO_ALTITUDE=2000000;
const MEO_ALTITUDE=10000000;
const GEO_ALTITUDE=35786000;

function createOrbit(name,altitude,color,width=4){
  const positions=[];
  for(let longitude=-180;longitude<=180;longitude+=1){
    positions.push(Cesium.Cartesian3.fromDegrees(longitude,0,altitude));
  }
  return viewer.entities.add({name,polyline:{positions,width,material:color,arcType:Cesium.ArcType.NONE}});
}

const leoOrbit=createOrbit("LEO Orbit",LEO_ALTITUDE,Cesium.Color.CYAN,5);
const meoOrbit=createOrbit("MEO Orbit",MEO_ALTITUDE,Cesium.Color.ORANGE,5);
const geoOrbit=createOrbit("GEO Orbit",GEO_ALTITUDE,Cesium.Color.LIME,5);

let leoLongitude=-30;
let meoLongitude=80;
const geoLongitude=20;
const LEO_SPEED=.05;
const MEO_SPEED=.015;

const leoPosition=new Cesium.CallbackPositionProperty(()=>Cesium.Cartesian3.fromDegrees(leoLongitude,0,LEO_ALTITUDE),false);
const meoPosition=new Cesium.CallbackPositionProperty(()=>Cesium.Cartesian3.fromDegrees(meoLongitude,0,MEO_ALTITUDE),false);
const geoPosition=Cesium.Cartesian3.fromDegrees(geoLongitude,0,GEO_ALTITUDE);

function createSatellite(name,position,labelColor){
  return viewer.entities.add({
    name,
    position,
    billboard:{
      image:"./satellite.png",
      width:45,
      height:45,
      disableDepthTestDistance:Number.POSITIVE_INFINITY
    },
    label:{
      text:name,
      font:"bold 16px Arial",
      fillColor:labelColor,
      outlineColor:Cesium.Color.BLACK,
      outlineWidth:3,
      style:Cesium.LabelStyle.FILL_AND_OUTLINE,
      showBackground:true,
      backgroundColor:Cesium.Color.BLACK.withAlpha(.8),
      pixelOffset:new Cesium.Cartesian2(0,-45),
      disableDepthTestDistance:Number.POSITIVE_INFINITY
    }
  });
}

createSatellite("LEO SATELLITE",leoPosition,Cesium.Color.CYAN);
createSatellite("MEO SATELLITE",meoPosition,Cesium.Color.ORANGE);
createSatellite("GEO SATELLITE",geoPosition,Cesium.Color.LIME);

let previousTime=performance.now();
function animateSatellites(now){
  const delta=now-previousTime;
  previousTime=now;
  leoLongitude+=LEO_SPEED*delta;
  meoLongitude+=MEO_SPEED*delta;
  if(leoLongitude>180)leoLongitude=-180;
  if(meoLongitude>180)meoLongitude=-180;
  requestAnimationFrame(animateSatellites);
}
requestAnimationFrame(animateSatellites);

viewer.camera.setView({destination:Cesium.Cartesian3.fromDegrees(10,18,90000000)});
setTimeout(()=>viewer.camera.flyTo({
  destination:Cesium.Cartesian3.fromDegrees(10,18,90000000),
  duration:1.6
}),300);

const orbitButtons=document.querySelectorAll(".orbit-button");
function activateButton(btn){orbitButtons.forEach(b=>b.classList.remove("active"));btn.classList.add("active");}
document.getElementById("btnAll").onclick=function(){activateButton(this);viewer.camera.flyTo({destination:Cesium.Cartesian3.fromDegrees(10,18,90000000),duration:2});};
document.getElementById("btnLeo").onclick=function(){activateButton(this);viewer.camera.flyTo({destination:Cesium.Cartesian3.fromDegrees(leoLongitude,15,22000000),duration:2});};
document.getElementById("btnMeo").onclick=function(){activateButton(this);viewer.camera.flyTo({destination:Cesium.Cartesian3.fromDegrees(meoLongitude,20,40000000),duration:2});};
document.getElementById("btnGeo").onclick=function(){activateButton(this);viewer.camera.flyTo({destination:Cesium.Cartesian3.fromDegrees(geoLongitude,20,90000000),duration:2});};

const startTime=Date.now();
setInterval(()=>{
  const total=Math.floor((Date.now()-startTime)/1000);
  const hh=String(Math.floor(total/3600)).padStart(2,"0");
  const mm=String(Math.floor((total%3600)/60)).padStart(2,"0");
  const ss=String(total%60).padStart(2,"0");
  document.getElementById("missionClock").textContent=`${hh}:${mm}:${ss}`;
},1000);

const telemetry={battery:87,voltage:48.2,temperature:41.3,attitudeError:.03,throughput:8.7,capacity:72.5,linkMargin:5.4,activeUsers:12460};
const history=[];
const expectedHistory=[];
function clamp(v,min,max){return Math.min(Math.max(v,min),max);}
function random(min,max){return Math.random()*(max-min)+min;}

function addEvent(type,message){
  const log=document.getElementById("eventLog");
  const row=document.createElement("div");
  row.className="event-item";
  row.innerHTML=`<span class="event-time">${new Date().toLocaleTimeString("en-GB",{hour12:false})}</span><span class="event-type ${type.toLowerCase()}">${type}</span><span>${message}</span>`;
  log.prepend(row);
  while(log.children.length>8)log.removeChild(log.lastChild);
}

function updateStatus(){
  let status="NOMINAL";
  if(telemetry.battery<68||telemetry.temperature>55||telemetry.capacity>95||telemetry.linkMargin<2||telemetry.attitudeError>.15)status="CRITICAL";
  else if(telemetry.battery<75||telemetry.temperature>50||telemetry.capacity>85||telemetry.linkMargin<3||telemetry.attitudeError>.10)status="WARNING";
  const text=document.getElementById("missionStatus");
  const dot=document.getElementById("missionStatusIndicator");
  text.textContent=status;
  text.className=status==="NOMINAL"?"nominal-text":status==="WARNING"?"warning-text":"critical-text";
  dot.className=`status-dot ${status.toLowerCase()}`;
}

function updateDisplay(){
  document.getElementById("batteryValue").textContent=telemetry.battery.toFixed(1)+" %";
  document.getElementById("batteryBar").style.width=telemetry.battery+"%";
  document.getElementById("voltageValue").textContent=telemetry.voltage.toFixed(1)+" V";
  document.getElementById("temperatureValue").textContent=telemetry.temperature.toFixed(1)+" °C";
  document.getElementById("attitudeValue").textContent=telemetry.attitudeError.toFixed(3)+"°";
  document.getElementById("throughputValue").textContent=telemetry.throughput.toFixed(1)+" Gbps";
  document.getElementById("capacityValue").textContent=telemetry.capacity.toFixed(1)+" %";
  document.getElementById("capacityBar").style.width=telemetry.capacity+"%";
  document.getElementById("linkMarginValue").textContent=telemetry.linkMargin.toFixed(1)+" dB";
  document.getElementById("activeUsersValue").textContent=Math.round(telemetry.activeUsers).toLocaleString();
}

function drawTrend(){
  const canvas=document.getElementById("trendCanvas");
  const ctx=canvas.getContext("2d");
  const w=canvas.width,h=canvas.height;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle="#081522";ctx.fillRect(0,0,w,h);
  ctx.strokeStyle="rgba(255,255,255,.08)";ctx.lineWidth=1;
  for(let i=1;i<5;i++){const y=i*h/5;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  if(history.length<2)return;
  const values=[...history,...expectedHistory];
  const min=Math.min(...values)-1;
  const max=Math.max(...values)+1;
  const toY=v=>h-((v-min)/(max-min))*h;
  const draw=(arr,color,dash=[])=>{
    ctx.strokeStyle=color;ctx.lineWidth=3;ctx.setLineDash(dash);ctx.beginPath();
    arr.forEach((v,i)=>{const x=i*(w/(Math.max(1,arr.length-1)));const y=toY(v);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
    ctx.stroke();ctx.setLineDash([]);
  };
  draw(expectedHistory,"#35e08b",[8,5]);
  draw(history,"#58c9ee");
  const current=history[history.length-1];
  const expected=expectedHistory[expectedHistory.length-1];
  const forecast=current+(current-history[Math.max(0,history.length-6)])/5*4;
  document.getElementById("trendActual").textContent=current.toFixed(1)+" °C";
  document.getElementById("trendExpected").textContent=expected.toFixed(1)+" °C";
  document.getElementById("trendForecast").textContent=forecast.toFixed(1)+" °C";
}

function updateTelemetry(){
  telemetry.battery=clamp(telemetry.battery+random(-.12,.08),65,100);
  telemetry.voltage=clamp(telemetry.voltage+random(-.08,.08),46,50);
  telemetry.temperature=clamp(telemetry.temperature+random(-.25,.25),35,60);
  telemetry.attitudeError=clamp(telemetry.attitudeError+random(-.005,.005),.01,.20);
  telemetry.throughput=clamp(telemetry.throughput+random(-.18,.18),4,12);
  telemetry.capacity=telemetry.throughput/12*100;
  telemetry.linkMargin=clamp(telemetry.linkMargin+random(-.12,.12),1.5,8);
  telemetry.activeUsers=clamp(telemetry.activeUsers+Math.round(random(-90,110)),8000,20000);
  history.push(telemetry.temperature);
  expectedHistory.push(41.5+.6*Math.sin((Date.now()-startTime)/18000));
  if(history.length>40){history.shift();expectedHistory.shift();}
  updateDisplay();updateStatus();drawTrend();
}

setInterval(updateTelemetry,2000);
setInterval(()=>addEvent("INFO",[
  "Telemetry packet received from spacecraft.",
  "Satellite health parameters verified.",
  "Payload performance data updated.",
  "Capacity utilization assessment completed.",
  "Orbit propagation status updated."
][Math.floor(Math.random()*5)]),8000);

updateDisplay();updateStatus();updateTelemetry();
addEvent("INFO","Mission control dashboard initialized.");
addEvent("INFO","LEO, MEO and GEO monitoring active.");
