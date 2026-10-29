"""Build the offline Android wrapper with the installed Android SDK (no Gradle dependencies)."""
from pathlib import Path
import argparse, os, subprocess, shutil, zipfile, hashlib, json, sys

parser=argparse.ArgumentParser()
parser.add_argument('--sdk',default=os.environ.get('ANDROID_SDK_ROOT') or os.environ.get('ANDROID_HOME'))
parser.add_argument('--qa',action='store_true',help='Build a separate debuggable APK for emulator inspection')
args=parser.parse_args()
if not args.sdk:parser.error('Specify --sdk or ANDROID_SDK_ROOT')
android=Path(__file__).resolve().parent
root=android.parent
sdk=Path(args.sdk).resolve()
tools=sdk/'build-tools/35.0.1'
jar=sdk/'platforms/android-35/android.jar'
java_home=Path(os.environ.get('JAVA_HOME','').rstrip('\\/'))
def jtool(name):return str(java_home/'bin'/(name+'.exe')) if (java_home/'bin'/(name+'.exe')).exists() else name
def run(cmd):
    print('RUN',Path(str(cmd[0])).name,flush=True)
    result=subprocess.run([str(x) for x in cmd],cwd=android,text=True)
    if result.returncode:raise SystemExit(result.returncode)
build=android/'build'/('qa' if args.qa else 'release')
if build.exists():
    assert build.resolve().is_relative_to((android/'build').resolve())
    shutil.rmtree(build)
assets=build/'assets/www';assets.mkdir(parents=True)
for p in root.iterdir():
    if p.is_file() and p.suffix in ['.html','.js','.css','.json','.md']:shutil.copy2(p,assets/p.name)
shutil.copytree(root/'fonts',assets/'fonts')
manifest=build/'AndroidManifest.xml'
manifest.write_text((android/'AndroidManifest.xml').read_text(encoding='utf-8').replace('android:debuggable="false"','android:debuggable="true"') if args.qa else (android/'AndroidManifest.xml').read_text(encoding='utf-8'),encoding='utf-8')
for n in ['gen','classes','dex']:(build/n).mkdir()
run([tools/'aapt2.exe','compile','--dir',android/'res','-o',build/'resources.zip'])
run([tools/'aapt2.exe','link','-o',build/'base.apk','-I',jar,'--manifest',manifest,'--java',build/'gen','--min-sdk-version','26','--target-sdk-version','35','-A',build/'assets',build/'resources.zip'])
sources=list((android/'src').rglob('*.java'))+list((build/'gen').rglob('*.java'))
run([jtool('javac'),'-encoding','UTF-8','--release','8','-classpath',jar,'-d',build/'classes',*sources])
run([tools/'d8.bat','--lib',jar,'--min-api','26','--output',build/'dex',*list((build/'classes').rglob('*.class'))])
with zipfile.ZipFile(build/'base.apk','r') as source,zipfile.ZipFile(build/'with-dex.apk','w') as z:
    for entry in source.infolist():z.writestr(entry,source.read(entry))
    z.write(build/'dex/classes.dex','classes.dex',compress_type=zipfile.ZIP_DEFLATED)
run([tools/'zipalign.exe','-f','-p','4',build/'with-dex.apk',build/'aligned.apk'])
keys=android/'keys';keys.mkdir(exist_ok=True)
keystore=keys/'qianqiu-test.jks'
# Local testing certificate; deliberately outside the web bundle and git. Retain for updates.
if not keystore.exists():run([jtool('keytool'),'-genkeypair','-keystore',keystore,'-storepass','android','-keypass','android','-alias','qianqiu-test','-keyalg','RSA','-keysize','3072','-validity','10000','-dname','CN=Qianqiu Android Testing, O=Qianqiu Exchange, C=CN'])
apk=build/('qianqiu-exchange-qa.apk' if args.qa else 'qianqiu-exchange-android.apk')
run([tools/'apksigner.bat','sign','--ks',keystore,'--ks-key-alias','qianqiu-test','--ks-pass','pass:android','--key-pass','pass:android','--v4-signing-enabled','false','--out',apk,build/'aligned.apk'])
run([tools/'apksigner.bat','verify','--verbose','--print-certs',apk])
run([tools/'zipalign.exe','-c','-p','4',apk])
info={'package':'cn.qianqiu.exchange','version':'0.3.2','versionCode':302,'minSdk':26,'targetSdk':35,'debuggable':args.qa,'bytes':apk.stat().st_size,'sha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'assets':{str(p.relative_to(assets)).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest() for p in assets.rglob('*') if p.is_file()}}
(build/'build-info.json').write_text(json.dumps(info,ensure_ascii=False,indent=2),encoding='utf-8')
print('APK',str(apk),apk.stat().st_size,info['sha256'],flush=True)
