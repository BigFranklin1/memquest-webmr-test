import {createMindArTracker} from '../src/imageAnchorTracker.js';
import {getAnchorTargetAssets} from '../src/anchorTargetAssets.js';

window.runTargetCheck=async(eventId,index)=>{
  const preset=getAnchorTargetAssets(eventId),image=new Image();image.src=preset.images[index].url;await image.decode();
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;
  const ctx=canvas.getContext('2d');const width=400*image.width/image.height;
  ctx.fillStyle='#c9c2b5';ctx.fillRect(0,0,640,480);ctx.drawImage(image,(640-width)/2,40,width,400);
  const stream=canvas.captureStream(12),video=document.querySelector('video');video.srcObject=stream;await video.play();video.width=video.videoWidth;video.height=video.videoHeight;
  let tracker;const abort=new AbortController();let found,done;
  const result=new Promise(resolve=>{done=resolve;});
  const timeout=setTimeout(()=>done({error:'No match within 30 seconds',eventId,index}),30000);
  try{
    tracker=await createMindArTracker({videoElement:video,targetUrl:preset.targetUrl,targetCount:preset.images.length,signal:abort.signal,
      onMatrix:(matrix,info)=>{if(matrix){found={eventId,expected:index,matched:info.targetIndex,dimensions:info.dimensions};done(found);}}});
    const report=await result;document.querySelector('#report').textContent=JSON.stringify(report);return report;
  }finally{clearTimeout(timeout);abort.abort();tracker?.stop();stream.getTracks().forEach(t=>t.stop());video.srcObject=null;}
};
