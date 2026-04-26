// StatPlay — module: SHARE / SAVE IMAGE
import {themeColors} from '../utils.js';

export function initShare(){
  const toastEl=document.createElement('div');
  toastEl.style.cssText='position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(20px);background:rgba(0,8,20,.92);color:#d8f7ff;border:1px solid rgba(0,243,255,.45);padding:10px 18px;font-family:"Courier New",monospace;font-size:13px;letter-spacing:1px;opacity:0;transition:.3s;z-index:10000;pointer-events:none;box-shadow:0 0 20px rgba(0,243,255,.35)';
  document.body.appendChild(toastEl);
  let toastT=null;
  function toast(msg){
    toastEl.textContent=msg;
    toastEl.style.opacity='1';toastEl.style.transform='translateX(-50%) translateY(0)';
    clearTimeout(toastT);
    toastT=setTimeout(()=>{toastEl.style.opacity='0';toastEl.style.transform='translateX(-50%) translateY(20px)';},2200);
  }
  function buildImage(srcId){
    const src=document.getElementById(srcId);
    const tc=themeColors();
    const _raw=window.devicePixelRatio||1;
    const dpr=(Number.isFinite(_raw)&&_raw>0)?Math.min(_raw,8):1;
    const srcLogicalW=src.width/dpr, srcLogicalH=src.height/dpr;
    const outDpr=2;
    const pad=24,footerH=36;
    const outW=srcLogicalW+pad*2, outH=srcLogicalH+pad+footerH;
    const out=document.createElement('canvas');
    out.width=outW*outDpr; out.height=outH*outDpr;
    const ctx=out.getContext('2d');
    if(!ctx) return null;
    ctx.setTransform(outDpr,0,0,outDpr,0,0);
    ctx.imageSmoothingQuality='high';
    ctx.fillStyle=tc.bg;ctx.fillRect(0,0,outW,outH);
    ctx.drawImage(src,0,0,src.width,src.height,pad,pad,srcLogicalW,srcLogicalH);
    ctx.font='11px "Courier New",monospace';ctx.fillStyle=tc.dim;
    const date=new Date().toISOString().slice(0,10);
    ctx.fillText((window.__LANG==='en'?'#StatPlay - ':'#StatPlay - ')+date,pad,outH-12);
    return out;
  }
  function downloadBlob(blob,filename){
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=filename;a.style.display='none';
    document.body.appendChild(a);a.click();
    setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(url);},100);
  }
  const SHARE_CONFIG={
    ja:{tweet:t=>t+' — スライダーで触ると統計の直感がつかめる',hashtags:'StatPlay,統計学,統計検定2級'},
    en:{tweet:t=>t+' — slide to build statistical intuition',hashtags:'StatPlay'}
  };
  function resolveTitle(btn){
    const isEn=window.__LANG==='en';
    return (isEn && btn.dataset.titleEn) ? btn.dataset.titleEn : btn.dataset.title;
  }
  function tweetText(title){
    const c=SHARE_CONFIG[window.__LANG==='en'?'en':'ja'];
    return c.tweet(title);
  }
  function hashtagsFor(){
    const c=SHARE_CONFIG[window.__LANG==='en'?'en':'ja'];
    return c.hashtags;
  }
  function buildTopicURL(srcId){
    const path=location.pathname;
    if(path.includes('/topics/')||path.includes('/columns/')||path.includes('/tables/')) return location.href;
    const src=document.getElementById(srcId);
    if(!src) return location.href;
    const section=src.closest('section');
    if(!section||!section.id) return location.href;
    const isEn=window.__LANG==='en';
    return location.origin+(isEn?'/en/topics/':'/topics/')+section.id+'.html';
  }
  function openX(text,url,hashtags){
    const intent='https://twitter.com/intent/tweet'
      +'?text='+encodeURIComponent(text)
      +'&url='+encodeURIComponent(url)
      +'&hashtags='+encodeURIComponent(hashtags);
    window.open(intent,'_blank','noopener,noreferrer');
  }
  function buildGraphURL(srcId){
    if(location.pathname.includes('/tables/')) return location.href;
    const src=document.getElementById(srcId);
    if(!src) return location.href;
    const panel=src.closest('.panel');
    const section=src.closest('section');
    const params=new URLSearchParams();
    if(panel){
      panel.querySelectorAll('input[type="range"], select').forEach(el=>{
        if(!el.id) return;
        params.set(el.id, el.value);
      });
    }
    const base=location.origin+location.pathname;
    const q=params.toString();
    const anchor=section && section.id ? '#'+section.id : '';
    return base+(q?('?'+q):'')+anchor;
  }
  async function copyToClipboard(text){
    try{
      if(navigator.clipboard && navigator.clipboard.writeText){
        await navigator.clipboard.writeText(text);
        return true;
      }
    }catch(_){}
    // Fallback: hidden textarea + execCommand
    try{
      const ta=document.createElement('textarea');
      ta.value=text;ta.style.position='fixed';ta.style.left='-9999px';
      document.body.appendChild(ta);ta.select();
      const ok=document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    }catch(_){return false;}
  }
  async function doShare(kind,srcId,title){
    const isEn=window.__LANG==='en';
    const src=document.getElementById(srcId);
    if(!src){toast(isEn?'Target not found':'対象が見つかりません');return;}
    // URL share — copy a deep-link that encodes slider state for this graph.
    if(kind==='url'){
      const url=buildGraphURL(srcId);
      const ok=await copyToClipboard(url);
      toast(ok
        ? (isEn?'Link copied · '+url.length+' chars':'URL をコピーしました（'+url.length+'文字）')
        : (isEn?'Copy failed — see console for URL':'コピー失敗（コンソールに URL を出力）'));
      if(!ok) console.log('Graph URL:', url);
      return;
    }
    // X (Twitter) intent — opens compose window with text+URL+hashtags.
    // X will fetch the page's OG image to show a card preview.
    if(kind==='x'){
      openX(tweetText(title), buildTopicURL(srcId), hashtagsFor());
      toast(isEn?'Opening X…':'Xを開いています…');
      return;
    }
    // Native share: open the system share sheet with title+text+URL (no files).
    if(kind==='native'){
      const shareURL=buildTopicURL(srcId);
      try{
        if(navigator.share){
          await navigator.share({title:title,text:tweetText(title)+' #'+hashtagsFor(),url:shareURL});
          toast(isEn?'Shared':'シェアしました');
          return;
        }
      }catch(e){
        if(e && e.name==='AbortError') return;
      }
      openX(tweetText(title),shareURL,hashtagsFor());
      toast(isEn?'Opening X…':'Xを開いています…');
      return;
    }
    // Download — still builds a per-graph image for personal saving.
    let canvas;
    try{canvas=buildImage(srcId);}catch(e){console.error('buildImage error',e);toast(isEn?'Failed to build image':'画像の組み立てに失敗');return;}
    const filename='statcyber_'+srcId+'.png';
    canvas.toBlob(blob=>{
      if(!blob){toast(isEn?'Failed to render image':'画像化に失敗しました');return;}
      downloadBlob(blob,filename);
      toast(isEn?'Saved image':'画像を保存しました');
    },'image/png');
  }
  // Inject companion SNS buttons (X + native share) next to each existing download button
  const hasNativeShare=!!(navigator.share);
  document.querySelectorAll('.share-btn.dl').forEach(dlBtn=>{
    const srcId=dlBtn.dataset.share;
    const title=dlBtn.dataset.title;
    const titleEn=dlBtn.dataset.titleEn||'';
    // URL share button — copies a link that encodes this graph's sliders
    const uBtn=document.createElement('button');
    uBtn.className='share-btn url';
    uBtn.dataset.share=srcId;uBtn.dataset.title=title;if(titleEn)uBtn.dataset.titleEn=titleEn;uBtn.dataset.kind='url';
    uBtn.innerHTML='<span data-lang="ja">🔗 URLコピー</span><span data-lang="en">🔗 Copy URL</span>';
    dlBtn.insertAdjacentElement('afterend',uBtn);
    // X (Twitter) button
    const xBtn=document.createElement('button');
    xBtn.className='share-btn x';
    xBtn.dataset.share=srcId;xBtn.dataset.title=title;if(titleEn)xBtn.dataset.titleEn=titleEn;xBtn.dataset.kind='x';
    xBtn.innerHTML='<span data-lang="ja">𝕏 でシェア</span><span data-lang="en">Share on 𝕏</span>';
    uBtn.insertAdjacentElement('afterend',xBtn);
    // Native share button (only on devices/browsers that support it)
    if(hasNativeShare){
      const nBtn=document.createElement('button');
      nBtn.className='share-btn native';
      nBtn.dataset.share=srcId;nBtn.dataset.title=title;if(titleEn)nBtn.dataset.titleEn=titleEn;nBtn.dataset.kind='native';
      nBtn.innerHTML='<span data-lang="ja">📤 シェア</span><span data-lang="en">📤 Share</span>';
      xBtn.insertAdjacentElement('afterend',nBtn);
    }
  });
  document.querySelectorAll('.share-btn').forEach(btn=>{
    btn.addEventListener('click',()=>doShare(btn.dataset.kind,btn.dataset.share,resolveTitle(btn)));
  });
}
