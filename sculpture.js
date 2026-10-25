(() => {
  'use strict';
  // Self-contained parametric 3D sculpture; no remote model or graphics library.
  const canvas = document.querySelector('[data-sculpture]');
  if (!canvas) return;
  const holder = canvas.parentElement;
  let gl;
  try { gl = canvas.getContext('webgl', {alpha:true,antialias:true,premultipliedAlpha:false,powerPreference:'low-power'}); } catch (_) { return; }
  if (!gl) return;
  const vertexSource = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    uniform vec2 uTurn;
    varying mediump vec3 vPosition;
    varying mediump vec3 vNormal;
    vec3 rotate(vec3 p) {
      float c = cos(uTurn.y), s = sin(uTurn.y);
      p = vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);
      c=cos(uTurn.x); s=sin(uTurn.x);
      return vec3(p.x,c*p.y-s*p.z,s*p.y+c*p.z);
    }
    void main() {
      vec3 p=rotate(aPosition);
      vPosition=p;
      vNormal=rotate(aNormal);
      gl_Position=vec4(p.x*0.6,p.y*0.6,-p.z*0.22,1.0);
    }`;
  const fragmentSource = `
    precision mediump float;
    varying mediump vec3 vPosition;
    varying mediump vec3 vNormal;
    void main() {
      vec3 n=normalize(vNormal);
      vec3 view=normalize(vec3(0.0,0.0,5.0)-vPosition);
      vec3 reflected=reflect(-view,n);
      vec3 key=normalize(vec3(-0.5,0.9,1.2));
      float diffuse=max(dot(n,key),0.0);
      float softbox=pow(max(0.0,1.0-abs(reflected.y-0.32)*2.6),8.0);
      float shine=pow(max(dot(reflect(-key,n),view),0.0),65.0);
      float fresnel=pow(1.0-max(dot(n,view),0.0),3.0);
      vec3 metal=vec3(0.14,0.12,0.12)+diffuse*vec3(0.31,0.29,0.29);
      metal+=softbox*vec3(0.73,0.71,0.71)+shine*vec3(0.75);
      float rim=max(dot(n,normalize(vec3(1.0,-0.2,0.3))),0.0);
      metal+=fresnel*rim*vec3(0.62,0.075,0.065);
      metal=mix(metal,vec3(1.0,0.22,0.22),pow(max(0.0,reflected.x),16.0)*0.25);
      gl_FragColor=vec4(pow(clamp(metal,0.0,1.0),vec3(0.85)),1.0);
    }`;
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Shader unavailable');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); throw new Error('Shader compilation unavailable'); }
    return shader;
  };
  let program;
  try {
    const vertex = compile(gl.VERTEX_SHADER,vertexSource);
    const fragment = compile(gl.FRAGMENT_SHADER,fragmentSource);
    program=gl.createProgram();
    gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
    gl.deleteShader(vertex);gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error('Program unavailable');
  } catch (_) { if (program) gl.deleteProgram(program); return; }
  const normalize = v => { const length=Math.hypot(...v);return v.map(x=>x/length); };
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const center = t => {const radius=1+0.3*Math.cos(3*t);return[radius*Math.cos(2*t),radius*Math.sin(2*t),0.3*Math.sin(3*t)];};
  const positions=[],normals=[],indices=[];
  const along=192,around=24;
  for(let i=0;i<=along;i++) {
    const t=i/along*Math.PI*2,c=center(t),next=center(t+0.0001);
    const tangent=normalize(next.map((v,k)=>v-c[k]));
    const side=normalize(cross(tangent,[0,0,1]));
    const up=cross(tangent,side);
    for(let j=0;j<=around;j++) {
      const angle=j/around*Math.PI*2;
      const normal=side.map((v,k)=>Math.cos(angle)*v+Math.sin(angle)*up[k]);
      positions.push(...c.map((v,k)=>v+normal[k]*0.185));
      normals.push(...normal);
    }
  }
  for(let i=0;i<along;i++)for(let j=0;j<around;j++) {
    const a=i*(around+1)+j,b=a+around+1;
    indices.push(a,a+1,b+1,a,b+1,b);
  }
  gl.useProgram(program);
  for(const [name,data] of [['aPosition',positions],['aNormal',normals]]) {
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
    const location=gl.getAttribLocation(program,name);
    if(location<0)return;
    gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,3,gl.FLOAT,false,0,0);
  }
  const indexBuffer=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
  const turn=gl.getUniformLocation(program,'uTurn');
  gl.enable(gl.DEPTH_TEST);gl.clearColor(0,0,0,0);
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible=true,lost=false,frame=0,lastDraw=-Infinity,elapsed=0,previous=0;
  const shouldAnimate=()=>!motion.matches&&!navigator.connection?.saveData&&visible&&!document.hidden&&!lost;
  const size = () => {
    const pixels=Math.max(1,Math.round(canvas.getBoundingClientRect().width*Math.min(window.devicePixelRatio||1,2)));
    if(canvas.width!==pixels||canvas.height!==pixels){canvas.width=pixels;canvas.height=pixels;}
    gl.viewport(0,0,pixels,pixels);
  };
  const draw = () => {
    if(lost)return;
    size();
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.uniform2f(turn,0.65+Math.sin(elapsed*0.00012)*0.12,0.45+elapsed*0.00009);
    gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
    holder.classList.add('is-ready');
  };
  const tick = timestamp => {
    frame=0;
    if(!shouldAnimate()){previous=0;return;}
    if(previous)elapsed+=Math.min(timestamp-previous,100);
    previous=timestamp;
    if(timestamp-lastDraw>=32){draw();lastDraw=timestamp;}
    frame=window.requestAnimationFrame(tick);
  };
  const update = () => {
    if(!shouldAnimate()){if(frame)window.cancelAnimationFrame(frame);frame=0;previous=0;}
    else if(!frame)frame=window.requestAnimationFrame(tick);
  };
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;holder.classList.remove('is-ready');update();});
  document.addEventListener('visibilitychange',update);
  window.addEventListener('pagehide',()=>{visible=false;update();});
  window.addEventListener('pageshow',()=>{visible=true;update();});
  window.addEventListener('resize',()=>{draw();update();},{passive:true});
  motion.addEventListener?.('change',()=>{draw();update();});
  if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;update();});observer.observe(canvas);}
  try {draw();update();} catch (_) {lost=true;holder.classList.remove('is-ready');update();}
})();
