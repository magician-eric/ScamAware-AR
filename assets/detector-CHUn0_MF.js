import{backend as e,engine as t,keep as n,registerKernel as r,stack as i,tensor as a,tidy as o}from"./dist-k7HO4ojL.js";var s=[{sigma:.55,points:[[-1,0],[-.5,-.866025],[.5,-.866025],[1,-0],[.5,.866025],[-.5,.866025]]},{sigma:.475,points:[[0,.930969],[-.806243,.465485],[-.806243,-.465485],[-0,-.930969],[.806243,-.465485],[.806243,.465485]]},{sigma:.4,points:[[.847306,-0],[.423653,.733789],[-.423653,.733789],[-.847306,0],[-.423653,-.733789],[.423653,-.733789]]},{sigma:.325,points:[[-0,-.741094],[.641806,-.370547],[.641806,.370547],[0,.741094],[-.641806,.370547],[-.641806,-.370547]]},{sigma:.25,points:[[-.595502,0],[-.297751,-.51572],[.297751,-.51572],[.595502,-0],[.297751,.51572],[-.297751,.51572]]},{sigma:.175,points:[[0,.362783],[-.314179,.181391],[-.314179,-.181391],[-0,-.362783],[.314179,-.181391],[.314179,.181391]]},{sigma:.1,points:[[0,0]]}],c=[];for(let e=0;e<s.length;e++){let t=s[e].sigma;for(let n=0;n<s[e].points.length;n++){let r=s[e].points[n];c.push([t,r[0],r[1]])}}var l={};function u(e){let t=e.shape[1],n=e.shape[0],r=`w`+t+`h`+n;return l.hasOwnProperty(r)||(l[r]=[{variableNames:[`p`],outputShape:[n,t],userCode:`
        void main() {
          ivec2 coords = getOutputCoords();

          float sum = getP(coords[0], coords[1]-2);
          sum += getP(coords[0], coords[1]-1) * 4.;
          sum += getP(coords[0], coords[1]) * 6.;
          sum += getP(coords[0], coords[1]+1) * 4.;
          sum += getP(coords[0], coords[1]+2);
          setOutput(sum);
        }
      `},{variableNames:[`p`],outputShape:[n,t],userCode:`
        void main() {
          ivec2 coords = getOutputCoords();

          float sum = getP(coords[0]-2, coords[1]);
          sum += getP(coords[0]-1, coords[1]) * 4.;
          sum += getP(coords[0], coords[1]) * 6.;
          sum += getP(coords[0]+1, coords[1]) * 4.;
          sum += getP(coords[0]+2, coords[1]);
          sum /= 256.;
          setOutput(sum);
        }
      `}]),l[r]}var d={kernelName:`BinomialFilter`,backendName:`webgl`,kernelFunc:e=>{let t=e.inputs.image,n=e.backend,[r,i]=u(t),a=n.runWebGLProgram(r,[t],t.dtype),o=n.runWebGLProgram(i,[a],t.dtype);return n.disposeIntermediateTensorInfo(a),o}},f=7,p=3,m=p*p,h=25/4,g={};function _(e){let t=e.shape[1],n=e.shape[0],r=`w`+t+`h`+n;return g.hasOwnProperty(r)||(g[r]={variableNames:[`image0`,`image1`,`image2`],outputShape:[n,t],userCode:`
        void main() {
          ivec2 coords = getOutputCoords();
    
          int y = coords[0];
          int x = coords[1];
    
          float value = getImage1(y, x);
    
          // Step 1: find local maxima/minima
          if (value * value < ${m}.) {
            setOutput(0.);
            return;
          }
          if (y < ${f} || y > ${n-1-f}) {
            setOutput(0.);
            return;
          }
          if (x < ${f} || x > ${t-1-f}) {
            setOutput(0.);
            return;
          }
    
          bool isMax = true;
          bool isMin = true;
          for (int dy = -1; dy <= 1; dy++) {
            for (int dx = -1; dx <= 1; dx++) {
              float value0 = getImage0(y+dy, x+dx);
              float value1 = getImage1(y+dy, x+dx);
              float value2 = getImage2(y+dy, x+dx);
    
        if (value < value0 || value < value1 || value < value2) {
          isMax = false;
        }
        if (value > value0 || value > value1 || value > value2) {
          isMin = false;
        }
            }
          }
    
          if (!isMax && !isMin) {
            setOutput(0.);
            return;
          }
    
          // compute edge score and reject based on threshold
          float dxx = getImage1(y, x+1) + getImage1(y, x-1) - 2. * getImage1(y, x);
          float dyy = getImage1(y+1, x) + getImage1(y-1, x) - 2. * getImage1(y, x);
          float dxy = 0.25 * (getImage1(y-1,x-1) + getImage1(y+1,x+1) - getImage1(y-1,x+1) - getImage1(y+1,x-1));
    
          float det = (dxx * dyy) - (dxy * dxy);
    
          if (abs(det) < 0.0001) { // determinant undefined. no solution
            setOutput(0.);
            return;
          }
    
          float edgeScore = (dxx + dyy) * (dxx + dyy) / det;
    
          if (abs(edgeScore) >= ${h} ) {
            setOutput(0.);
            return;
          }
          setOutput(getImage1(y,x));
        }
      `}),g[r]}var v={kernelName:`BuildExtremas`,backendName:`webgl`,kernelFunc:e=>{let{image0:n,image1:r,image2:i}=e.inputs,a=e.backend,o=_(r);return n=t().runKernel(`DownsampleBilinear`,{image:n}),i=t().runKernel(`UpsampleBilinear`,{image:i,targetImage:r}),a.runWebGLProgram(o,[n,r,i],r.dtype)}},y=36,b={};function x(e){let t=e.shape[0];return b.hasOwnProperty(t)||(b[t]={variableNames:[`histogram`],outputShape:[e.shape[0]],userCode:`
            void main() {
                int featureIndex = getOutputCoords();

                int maxIndex = 0;
                for (int i = 1; i < ${y}; i++) {
                    if (getHistogram(featureIndex, i) > getHistogram(featureIndex, maxIndex)) {
                        maxIndex = i;
                    }
                }

                int prev = imod(maxIndex - 1 + ${y}, ${y});
                int next = imod(maxIndex + 1, ${y});

                /**
                 * Fit a quatratic to 3 points. The system of equations is:
                 *
                 * y0 = A*x0^2 + B*x0 + C
                 * y1 = A*x1^2 + B*x1 + C
                 * y2 = A*x2^2 + B*x2 + C
                 *
                 * This system of equations is solved for A,B,C.
                 */
                float p10 = float(maxIndex - 1);
                float p11 = getHistogram(featureIndex, prev); 
                float p20 = float(maxIndex);
                float p21 = getHistogram(featureIndex, maxIndex); 
                float p30 = float(maxIndex + 1);
                float p31 = getHistogram(featureIndex, next); 

                float d1 = (p30-p20)*(p30-p10);
                float d2 = (p10-p20)*(p30-p10);
                float d3 = p10-p20;

                // If any of the denominators are zero then, just use maxIndex.
                    float fbin = float(maxIndex);
                if ( abs(d1) > 0.00001 && abs(d2) > 0.00001 && abs(d3) > 0.00001) {
                float a = p10*p10;
                float b = p20*p20;

                // Solve for the coefficients A,B,C
                float A = ((p31-p21)/d1)-((p11-p21)/d2);
                float B = ((p11-p21)+(A*(b-a)))/d3;
                float C = p11-(A*a)-(B*p10);
                fbin = -B / (2. * A);
                }

                float an = 2.0 *${Math.PI} * (fbin + 0.5) / ${y}. - ${Math.PI};
                setOutput(an);
            }
            `}),b[t]}var S={kernelName:`ComputeExtremaAngles`,backendName:`webgl`,kernelFunc:e=>{let{histograms:t}=e.inputs,n=e.backend,r=x(t);return n.runWebGLProgram(r,[t],t.dtype)}},C=7,w={};function T(e,t){let n=`${e}|${t.shape[0]}`;if(!w.hasOwnProperty(n)){let r=[];for(let t=1;t<e;t++)r.push(`image`+t);let i=`float getPixel(int octave, int y, int x) {`;for(let t=1;t<e;t++)i+=`
  if (octave == ${t}) {
	return getImage${t}(y, x);
  }
`;i+=`}`,w[n]={variableNames:[...r,`extrema`,`angles`,`freakPoints`],outputShape:[t.shape[0],c.length],userCode:`
  ${i}
  void main() {
	ivec2 coords = getOutputCoords();
	int featureIndex = coords[0];
	int freakIndex = coords[1];

	float freakSigma = getFreakPoints(freakIndex, 0);
	float freakX = getFreakPoints(freakIndex, 1);
	float freakY = getFreakPoints(freakIndex, 2);

	int octave = int(getExtrema(featureIndex, 1));
	float inputY = getExtrema(featureIndex, 2);
	float inputX = getExtrema(featureIndex, 3);
	float inputAngle = getAngles(featureIndex);
	float cos = ${C}. * cos(inputAngle);
	float sin = ${C}. * sin(inputAngle);

	float yp = inputY + freakX * sin + freakY * cos;
	float xp = inputX + freakX * cos + freakY * -sin;

	int x0 = int(floor(xp));
	int x1 = x0 + 1;
	int y0 = int(floor(yp));
	int y1 = y0 + 1;

	float f1 = getPixel(octave, y0, x0);
	float f2 = getPixel(octave, y0, x1);
	float f3 = getPixel(octave, y1, x0);
	float f4 = getPixel(octave, y1, x1);

	float x1f = float(x1);
	float y1f = float(y1);
	float x0f = float(x0);
	float y0f = float(y0);

	// ratio for interpolation between four neighbouring points
	float value = (x1f - xp) * (y1f - yp) * f1
		+ (xp - x0f) * (y1f - yp) * f2
		+ (x1f - xp) * (yp - y0f) * f3
		+ (xp - x0f) * (yp - y0f) * f4;

	setOutput(value);
  }
`}}return w[n]}var E={kernelName:`ComputeExtremaFreak`,backendName:`webgl`,kernelFunc:e=>{let{gaussianImagesT:t,prunedExtremas:n,prunedExtremasAngles:r,freakPointsT:i,pyramidImagesLength:a}=e.inputs,o=e.backend,s=T(a,n);return o.runWebGLProgram(s,[...t,n,r,i],`float32`)}},D=(c.length-1)*c.length/2,O=Math.ceil(D/8),k={};function A(e){let t=`${e.shape[0]}`;return k.hasOwnProperty(t)||(k[t]={variableNames:[`freak`,`p`],outputShape:[e.shape[0],O],userCode:`
  void main() {
    ivec2 coords = getOutputCoords();
    int featureIndex = coords[0];
    int descIndex = coords[1] * 8;

    int sum = 0;
    for (int i = 0; i < 8; i++) {
      if (descIndex + i >= ${D}) {
        continue;
      }

      int p1 = int(getP(descIndex + i, 0));
      int p2 = int(getP(descIndex + i, 1));

      float v1 = getFreak(featureIndex, p1);
      float v2 = getFreak(featureIndex, p2);

      if (v1 < v2 + 0.01) {
        sum += int(pow(2.0, float(7 - i)));
      }
    }
    setOutput(float(sum));
  }
`}),k[t]}var ee={kernelName:`ComputeFreakDescriptors`,backendName:`webgl`,kernelFunc:e=>{let{extremaFreaks:t,positionT:n}=e.inputs,{backend:r}=e,i=A(t);return r.runWebGLProgram(i,[t,n],`int32`)}},j={};function M(e,t){let n=`${e}|${t}`;if(!j.hasOwnProperty(n)){let r=[],i=`float getPixel(int octave, int y, int x) {`;for(let t=1;t<e;t++)r.push(`image`+t),i+=`
				if (octave == ${t}) {
					return getImage${t}(y, x);
				}
			`;i+=`}`,j[n]={variableNames:[...r,`extrema`],outputShape:[t,3,3],userCode:`
			${i}
		
			void main() {
				ivec3 coords = getOutputCoords();
				int featureIndex = coords[0];
				float score = getExtrema(featureIndex, 0);
				if (score == 0.0) {
					return;
				}
		
				int dy = coords[1]-1;
				int dx = coords[2]-1;
				int octave = int(getExtrema(featureIndex, 1));
				int y = int(getExtrema(featureIndex, 2));
				int x = int(getExtrema(featureIndex, 3));
				setOutput(getPixel(octave, y+dy, x+dx));
			}
			`}}return j[n]}var N={kernelName:`ComputeLocalization`,backendName:`webgl`,kernelFunc:e=>{let{prunedExtremasList:t,dogPyramidImagesT:n}=e.inputs,r=e.backend,i=M(n.length,t.length),o=a(t,[t.length,t[0].length],`int32`);return r.runWebGLProgram(i,[...n.slice(1),o],n[0].dtype)}},P=.159154943091895,F=36,I={};function L(e,t,n){let r=`${n}|${e.shape[0]}|${t.shape[0]}`;if(!I.hasOwnProperty(r)){let i=[];for(let e=1;e<n;e++)i.push(`image`+e);let a=`float getPixel(int octave, int y, int x) {`;for(let e=1;e<n;e++)a+=`
            if (octave == ${e}) {
                return getImage${e}(y, x);
            }
            `;a+=`}`,I[r]=[{variableNames:[...i,`extrema`,`radial`],outputShape:[e.shape[0],t.shape[0],2],userCode:`
                ${a}

                void main() {
                    ivec3 coords = getOutputCoords();
                    int featureIndex = coords[0];
                    int radialIndex = coords[1];
                    int propertyIndex = coords[2];

                    int radialY = int(getRadial(radialIndex, 0));
                    int radialX = int(getRadial(radialIndex, 1));
                    float radialW = getRadial(radialIndex, 2);

                    int octave = int(getExtrema(featureIndex, 1));
                    int y = int(getExtrema(featureIndex, 2));
                    int x = int(getExtrema(featureIndex, 3));

                    int xp = x + radialX;
                    int yp = y + radialY;

                    float dy = getPixel(octave, yp+1, xp) - getPixel(octave, yp-1, xp);
                    float dx = getPixel(octave, yp, xp+1) - getPixel(octave, yp, xp-1);

                    if (propertyIndex == 0) {
                    // be careful that atan(0, 0) gives 1.57 instead of 0 (different from js), but doesn't matter here, coz magnitude is 0
                    
                    float angle = atan(dy, dx) + ${Math.PI};
                    float fbin = angle * ${F}. * ${P};
                    setOutput(fbin);
                    return;
                    }

                    if (propertyIndex == 1) {
                        float mag = sqrt(dx * dx + dy * dy);
                        float magnitude = radialW * mag;
                        setOutput(magnitude);
                        return;
                    }
                }

                `},{variableNames:[`fbinMag`],outputShape:[e.shape[0],F],userCode:`
            void main() {
                ivec2 coords = getOutputCoords();
                int featureIndex = coords[0];
                int binIndex = coords[1];

                float sum = 0.;
                for (int i = 0; i < ${t.shape[0]}; i++) {
                    float fbin = getFbinMag(featureIndex, i, 0);
                    int bin = int(floor(fbin - 0.5));
                    int b1 = imod(bin + ${F}, ${F});
                    int b2 = imod(bin + 1 + ${F}, ${F});

                    if (b1 == binIndex || b2 == binIndex) {
                        float magnitude = getFbinMag(featureIndex, i, 1);
                        float w2 = fbin - float(bin) - 0.5;
                        float w1 = w2 * -1. + 1.;

                        if (b1 == binIndex) {
                            sum += w1 * magnitude;
                        }
                        if (b2 == binIndex) {
                            sum += w2 * magnitude;
                        }
                    }
                }
                setOutput(sum);
            }
            `}]}return I[r]}var R={kernelName:`ComputeOrientationHistograms`,backendName:`webgl`,kernelFunc:e=>{let{gaussianImagesT:t,prunedExtremasT:n,radialPropertiesT:r,pyramidImagesLength:i}=e.inputs,a=e.backend,[o,s]=L(n,r,i),c=a.runWebGLProgram(o,[...t,n,r],r.dtype),l=a.runWebGLProgram(s,[c],r.dtype);return a.disposeIntermediateTensorInfo(c),l}},z={};function B(e){let t=e.shape[1],n=e.shape[0],r=`w`+t+`h`+n;return z.hasOwnProperty(r)||(z[r]={variableNames:[`p`],outputShape:[Math.floor(n/2),Math.floor(t/2)],userCode:`
            void main() {
                ivec2 coords = getOutputCoords();
                int y = coords[0] * 2;
                int x = coords[1] * 2;
        
                float sum = getP(y, x) * 0.25;
                sum += getP(y+1,x) * 0.25; 
                sum += getP(y, x+1) * 0.25; 
                sum += getP(y+1,x+1) * 0.25;
                setOutput(sum);
            }
            `}),z[r]}var V={kernelName:`DownsampleBilinear`,backendName:`webgl`,kernelFunc:e=>{let t=e.inputs.image,n=e.backend,r=B(t);return n.runWebGLProgram(r,[t],t.dtype)}},H={kernelName:`ExtremaReduction`,backendName:`webgl`,kernelFunc:e=>{let{extremasResultT:t}=e.inputs,n=e.backend,r=t.shape[0],i=t.shape[1],a={variableNames:[`extrema`],outputShape:[Math.floor(r/2),Math.floor(i/2)],userCode:`
		  void main() {
			ivec2 coords = getOutputCoords();
			int y = coords[0] * 2;
			int x = coords[1] * 2;
  
			float location = 0.0;
			float values = getExtrema(y, x);
  
			if (getExtrema(y+1, x) != 0.0) {
			  location = 1.0;
		  values = getExtrema(y+1, x);
			}
			else if (getExtrema(y, x+1) != 0.0) {
			  location = 2.0;
		  values = getExtrema(y, x+1);
			}
			else if (getExtrema(y+1, x+1) != 0.0) {
			  location = 3.0;
		  values = getExtrema(y+1, x+1);
			}
  
			if (values < 0.0) {
			  setOutput(location * -1000.0 + values);
			} else {
			  setOutput(location * 1000.0 + values);
			}
		  }
		`};return n.runWebGLProgram(a,[t],t.dtype)}},U=36,W=5,G={};function K(e){let t=`h${e.shape[0]}`;return G.hasOwnProperty(t)||(G[t]={variableNames:[`histogram`],outputShape:[e.shape[0],U],userCode:`
            void main() {
                ivec2 coords = getOutputCoords();

                int featureIndex = coords[0];
                int binIndex = coords[1];

                int prevBin = imod(binIndex - 1 + ${U}, ${U});
                int nextBin = imod(binIndex + 1, ${U});
                float result = 0.274068619061197 * getHistogram(featureIndex, prevBin) + 0.451862761877606 * getHistogram(featureIndex, binIndex) + 0.274068619061197 * getHistogram(featureIndex, nextBin);

                setOutput(result);
            }
            `}),G[t]}var q={kernelName:`SmoothHistograms`,backendName:`webgl`,kernelFunc:e=>{let{histograms:t}=e.inputs,n=e.backend,r=K(t);for(let e=0;e<W;e++){let i=t;t=n.runWebGLProgram(r,[t],t.dtype),e>0&&n.disposeIntermediateTensorInfo(i)}return t}},J={};function Y(e,t){let n=t.shape[1],r=t.shape[0],i=`w`+n+`h`+r;return J.hasOwnProperty(i)||(J[i]={variableNames:[`p`],outputShape:[r,n],userCode:`
              void main() {
                ivec2 coords = getOutputCoords();
                int j = coords[0];
                int i = coords[1];
        
                float sj = 0.5 * float(j) - 0.25; 
                float si = 0.5 * float(i) - 0.25;
        
                float sj0 = floor(sj);
                float sj1 = ceil(sj);
                float si0 = floor(si);
                float si1 = ceil(si);
        
                int sj0I = int(sj0);
                int sj1I = int(sj1);
                int si0I = int(si0);
                int si1I = int(si1);
        
                float sum = 0.0;
                sum += getP(sj0I, si0I) * (si1 - si) * (sj1 - sj);
                sum += getP(sj1I, si0I) * (si1 - si) * (sj - sj0);
                sum += getP(sj0I, si1I) * (si - si0) * (sj1 - sj);
                sum += getP(sj1I, si1I) * (si - si0) * (sj - sj0);
                setOutput(sum);
              }
            `}),J[i]}r(d),r(v),r(S),r(E),r(ee),r(N),r(R),r(V),r(H),r(q),r({kernelName:`UpsampleBilinear`,backendName:`webgl`,kernelFunc:e=>{let{image:t,targetImage:n}=e.inputs,r=e.backend,i=Y(t,n);return r.runWebGLProgram(i,[t],t.dtype)}});var X=8,Z=5,Q=10,te=5,$=3,ne=1.5,re=(c.length-1)*c.length/2,ie=class{constructor(e,t,n=!1){this.debugMode=n,this.width=e,this.height=t;let r=0;for(;e>=X&&t>=X&&(e/=2,t/=2,r++,r!==Z););this.numOctaves=r,this.tensorCaches={},this.kernelCaches={}}detectImageData(e){let t=new Uint8ClampedArray(4*e.length);for(let n=0;n<e.length;n++)t[4*n]=e[n],t[4*n+1]=e[n],t[4*n+2]=e[n],t[4*n+3]=255;let n=new ImageData(t,this.width,this.height);return this.detect(n)}detect(e){let t=null,n=[];for(let t=0;t<this.numOctaves;t++){let r,i;r=t===0?this._applyFilter(e):this._downsampleBilinear(n[t-1][n[t-1].length-1]),i=this._applyFilter(r),n.push([r,i])}let r=[];for(let e=0;e<this.numOctaves;e++){let t=this._differenceImageBinomial(n[e][0],n[e][1]);r.push(t)}let i=[];for(let e=1;e<this.numOctaves-1;e++){let t=this._buildExtremas(r[e-1],r[e],r[e+1]);i.push(t)}let a=this._applyPrune(i),o=this._computeLocalization(a,r),s=this._computeOrientationHistograms(o,n),c=this._smoothHistograms(s),l=this._computeExtremaAngles(c),u=this._computeExtremaFreak(n,o,l),d=this._computeFreakDescriptors(u),f=o.arraySync(),p=l.arraySync(),m=d.arraySync();this.debugMode&&(t={pyramidImages:n.map(e=>e.map(e=>e.arraySync())),dogPyramidImages:r.map(e=>e?e.arraySync():null),extremasResults:i.map(e=>e.arraySync()),extremaAngles:l.arraySync(),prunedExtremas:a,localizedExtremas:o.arraySync()}),n.forEach(e=>e.forEach(e=>e.dispose())),r.forEach(e=>e&&e.dispose()),i.forEach(e=>e.dispose()),o.dispose(),s.dispose(),c.dispose(),l.dispose(),u.dispose(),d.dispose();let h=[];for(let e=0;e<f.length;e++){if(f[e][0]==0)continue;let t=[];for(let n=0;n<m[e].length;n+=4){let r=m[e][n],i=m[e][n+1],a=m[e][n+2],o=m[e][n+3],s=r*16777216+i*65536+a*256+o;t.push(s)}let n=f[e][1],r=f[e][2],i=f[e][3]*2**n+2**(n-1)-.5,a=r*2**n+2**(n-1)-.5,o=2**n;h.push({maxima:f[e][0]>0,x:i,y:a,scale:o,angle:p[e],descriptors:t})}return{featurePoints:h,debugExtra:t}}_computeFreakDescriptors(e){if(!this.tensorCaches.computeFreakDescriptors){let t=[],r=[];for(let n=0;n<e.shape[1];n++)for(let i=n+1;i<e.shape[1];i++)t.push(n),r.push(i);let o=a(t,[t.length]).cast(`int32`),s=a(r,[r.length]).cast(`int32`);this.tensorCaches.computeFreakDescriptors={positionT:n(i([o,s],1))}}let{positionT:r}=this.tensorCaches.computeFreakDescriptors;return Math.ceil(re/8),o(()=>t().runKernel(`ComputeFreakDescriptors`,{extremaFreaks:e,positionT:r}))}_computeExtremaFreak(e,r,i){this.tensorCaches._computeExtremaFreak||o(()=>{let e=a(c);this.tensorCaches._computeExtremaFreak={freakPointsT:n(e)}});let{freakPointsT:s}=this.tensorCaches._computeExtremaFreak,l=[];for(let t=1;t<e.length;t++)l.push(e[t][1]);return o(()=>t().runKernel(`ComputeExtremaFreak`,{gaussianImagesT:l,prunedExtremas:r,prunedExtremasAngles:i,freakPointsT:s,pyramidImagesLength:e.length}))}_computeExtremaAngles(e){return o(()=>t().runKernel(`ComputeExtremaAngles`,{histograms:e}))}_computeOrientationHistograms(e,r){let i=[];for(let e=1;e<r.length;e++)i.push(r[e][1]);this.tensorCaches.orientationHistograms||o(()=>{let e=-1/(2*$*$),t=$*ne,r=Math.ceil(t),i=[];for(let n=-5;n<=r;n++)for(let a=-5;a<=r;a++){let r=a*a+n*n;if(r<=t*t){let t=r*e,o=(720+t*(720+t*(360+t*(120+t*(30+t*(6+t))))))*.0013888888;i.push([n,a,o])}}this.tensorCaches.orientationHistograms={radialPropertiesT:n(a(i,[i.length,3]))}});let{radialPropertiesT:s}=this.tensorCaches.orientationHistograms;return o(()=>t().runKernel(`ComputeOrientationHistograms`,{gaussianImagesT:i,prunedExtremasT:e,radialPropertiesT:s,pyramidImagesLength:r.length}))}_smoothHistograms(e){return o(()=>t().runKernel(`SmoothHistograms`,{histograms:e}))}_computeLocalization(e,n){return o(()=>{let r=t().runKernel(`ComputeLocalization`,{prunedExtremasList:e,dogPyramidImagesT:n}).arraySync(),i=[];for(let e=0;e<r.length;e++){i.push([]);for(let t=0;t<r[e].length;t++)i[e].push([])}let o=[];for(let t=0;t<e.length;t++)o[t]=[e[t][0],e[t][1],e[t][2],e[t][3]];for(let e=0;e<o.length;e++){if(o[e][0]===0)continue;let t=r[e],n=.5*(t[1][2]-t[1][0]),i=.5*(t[2][1]-t[0][1]),a=t[1][2]+t[1][0]-2*t[1][1],s=t[2][1]+t[0][1]-2*t[1][1],c=.25*(t[0][0]+t[2][2]-t[0][2]-t[2][0]),l=a*s-c*c,u=(s*-n+-c*-i)/l,d=(-c*-n+a*-i)/l,f=o[e][2]+d,p=o[e][3]+u;Math.abs(l)<1e-4||(o[e][2]=f,o[e][3]=p)}return a(o,[o.length,o[0].length],`float32`)})}_applyPrune(e){let n=Q*Q,r=te,i=[],a=[];for(let e=0;e<n;e++){a.push([]),i.push([]);for(let t=0;t<r;t++)a[e].push([0,0,0,0]),i[e].push(0)}o(()=>{for(let n=0;n<e.length;n++){let o=t().runKernel(`ExtremaReduction`,{extremasResultT:e[n]}),s=n+1,c=o.arraySync(),l=o.shape[0],u=o.shape[1],d=u*2/Q,f=l*2/Q;for(let e=0;e<l;e++)for(let t=0;t<u;t++){let n=c[e][t];if(n==0)continue;let o=n%1e3,l=Math.floor(Math.abs(n)/1e3),u=t*2+ +(l===2||l===3),p=e*2+ +(l===1||l===3),m=Math.floor(u/d),h=Math.floor(p/f)*Q+m,g=Math.abs(o),_=r;for(;_>=1&&g>i[h][_-1];)--_;if(_<r){for(let e=r-1;e>=_+1;e--)i[h][e]=i[h][e-1],a[h][e][0]=a[h][e-1][0],a[h][e][1]=a[h][e-1][1],a[h][e][2]=a[h][e-1][2],a[h][e][3]=a[h][e-1][3];i[h][_]=g,a[h][_][0]=o,a[h][_][1]=s,a[h][_][2]=p,a[h][_][3]=u}}}});let s=[];for(let e=0;e<n;e++)for(let t=0;t<r;t++)s.push(a[e][t]);return s}_buildExtremas(e,n,r){return o(()=>t().runKernel(`BuildExtremas`,{image0:e,image1:n,image2:r}))}_differenceImageBinomial(e,t){return o(()=>e.sub(t))}_applyFilter(e){return o(()=>t().runKernel(`BinomialFilter`,{image:e}))}_downsampleBilinear(e){return o(()=>t().runKernel(`DownsampleBilinear`,{image:e}))}_compileAndRun(n,r){let i=e().compileAndRun(n,r);return t().makeTensorFromDataId(i.dataId,i.shape,i.dtype)}_runWebGLProgram(n,r,i){let a=e().runWebGLProgram(n,r,i);return t().makeTensorFromDataId(a.dataId,a.shape,a.dtype)}};export{ie as t};