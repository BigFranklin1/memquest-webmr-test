// Derived UI previews only: original reference pixels and compiled targets are unchanged.
import {readFile,writeFile} from 'node:fs/promises';
import {PNG} from 'pngjs';
import {ANCHOR_TARGET_SETS} from '../src/anchorTargets.js';
for(const set of Object.values(ANCHOR_TARGET_SETS))for(const image of set.images){
  const source=PNG.sync.read(await readFile(new URL('../src/assets/tracking/'+image.file,import.meta.url)));
  const scale=Math.min(1,192/Math.max(source.width,source.height));
  const target=new PNG({width:Math.round(source.width*scale),height:Math.round(source.height*scale)});
  for(let y=0;y<target.height;y++)for(let x=0;x<target.width;x++){
    const left=Math.floor(x*source.width/target.width),right=Math.max(left+1,Math.floor((x+1)*source.width/target.width));
    const top=Math.floor(y*source.height/target.height),bottom=Math.max(top+1,Math.floor((y+1)*source.height/target.height));
    const sums=[0,0,0,0];
    for(let sy=top;sy<bottom;sy++)for(let sx=left;sx<right;sx++)for(let c=0;c<4;c++)sums[c]+=source.data[(sy*source.width+sx)*4+c];
    for(let c=0;c<4;c++)target.data[(y*target.width+x)*4+c]=Math.round(sums[c]/((right-left)*(bottom-top)));
  }
  await writeFile(new URL('../src/assets/tracking/'+image.id+'-thumb.png',import.meta.url),PNG.sync.write(target));
}
