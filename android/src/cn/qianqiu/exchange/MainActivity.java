package cn.qianqiu.exchange;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;

/** Offline assets have an HTTPS origin. Remote pages always leave the app WebView. */
public class MainActivity extends Activity {
    private static final String HOST="appassets.androidplatform.net";
    private static final String START="https://"+HOST+"/assets/www/index.html";
    private static final int PICK_JSON=21, SAVE_JSON=22;
    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private byte[] exportBytes;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(244,236,217));
        getWindow().setNavigationBarColor(Color.rgb(244,236,217));
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        FrameLayout frame=new FrameLayout(this);
        frame.setBackgroundColor(Color.rgb(244,236,217));
        if(Build.VERSION.SDK_INT>=35){
            getWindow().setDecorFitsSystemWindows(false);
            frame.setOnApplyWindowInsetsListener((v,insets)->{
                android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());
                android.graphics.Insets keyboard=insets.getInsets(WindowInsets.Type.ime());
                v.setPadding(bars.left,bars.top,bars.right,Math.max(bars.bottom,keyboard.bottom));
                return WindowInsets.CONSUMED;
            });
        }
        web=new WebView(this);
        frame.addView(web,new FrameLayout.LayoutParams(-1,-1));setContentView(frame);
        WebSettings settings=web.getSettings();
        settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);settings.setSupportMultipleWindows(false);
        settings.setTextZoom(100);settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setUserAgentString(settings.getUserAgentString()+" QianqiuAndroid/0.3.2");
        web.setBackgroundColor(Color.rgb(244,236,217));
        // Enabled only in the separately built QA APK, never in the distributable APK.
        WebView.setWebContentsDebuggingEnabled((getApplicationInfo().flags&2)!=0);
        web.addJavascriptInterface(new SaveBridge(),"HXAndroid");
        web.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
                Uri u=request.getUrl();
                if(!HOST.equals(u.getHost()))return null;
                if(!"GET".equals(request.getMethod())||!local(u))return missing();
                String name=u.getPath().substring("/assets/".length());
                if(name.contains("..")||name.contains("\\"))return missing();
                try{
                    String mime=mime(name);
                    WebResourceResponse response=new WebResourceResponse(mime,"UTF-8",getAssets().open(name));
                    HashMap<String,String> headers=new HashMap<>();
                    headers.put("Cache-Control","no-cache");headers.put("X-Content-Type-Options","nosniff");
                    headers.put("Content-Security-Policy","default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src https:; frame-src 'none'; object-src 'none'; base-uri 'self'");
                    response.setResponseHeaders(headers);return response;
                }catch(Exception ignored){return missing();}
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return navigate(request.getUrl());}
            @Override public boolean shouldOverrideUrlLoading(WebView view,String url){return navigate(Uri.parse(url));}
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){
                if(!isTrusted()){callback.onReceiveValue(null);return true;}
                if(fileCallback!=null)fileCallback.onReceiveValue(null);
                fileCallback=callback;
                Intent pick=new Intent(Intent.ACTION_OPEN_DOCUMENT);pick.addCategory(Intent.CATEGORY_OPENABLE);pick.setType("application/json");
                try{startActivityForResult(pick,PICK_JSON);}catch(Exception e){fileCallback.onReceiveValue(null);fileCallback=null;toast("当前设备没有可用的文件选择器");}
                return true;
            }
        });
        web.setDownloadListener((url,ua,disposition,mime,length)->{if(url.startsWith("https://"))external(Uri.parse(url));else toast("请使用游戏内的存档导出按钮");});
        web.loadUrl(START);
    }
    private boolean local(Uri u){return "https".equals(u.getScheme())&&HOST.equals(u.getHost())&&u.getPath()!=null&&u.getPath().startsWith("/assets/www/");}
    private boolean isTrusted(){return web!=null&&web.getUrl()!=null&&local(Uri.parse(web.getUrl()));}
    private boolean navigate(Uri u){
        if(local(u))return false;
        if("https".equals(u.getScheme()))external(u);
        else toast("此链接不会在游戏内打开");
        return true;
    }
    private void external(Uri uri){try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(Exception e){toast("未找到浏览器，请手动打开链接");}}
    private void toast(String s){Toast.makeText(this,s,Toast.LENGTH_LONG).show();}
    private void reportExport(String status){if(isTrusted())web.evaluateJavascript("window.dispatchEvent(new CustomEvent('hx-export-result',{detail:'"+status+"'}))",null);}
    public class SaveBridge {
        @JavascriptInterface public void saveDocument(String filename,String content){
            if(filename==null||content==null||content.length()>4*1024*1024)return;
            byte[] bytes=content.getBytes(StandardCharsets.UTF_8);if(bytes.length>4*1024*1024)return;
            runOnUiThread(()->{
                if(!isTrusted())return;
                if(exportBytes!=null){toast("请先完成或取消上一次保存");return;}
                String name=filename.replaceAll("[^a-zA-Z0-9._-]","_");if(!name.endsWith(".json"))name+=".json";
                exportBytes=bytes;
                Intent save=new Intent(Intent.ACTION_CREATE_DOCUMENT);save.addCategory(Intent.CATEGORY_OPENABLE);save.setType("application/json");save.putExtra(Intent.EXTRA_TITLE,name);
                try{startActivityForResult(save,SAVE_JSON);}catch(Exception e){exportBytes=null;reportExport("failed");}
            });
        }
    }
    @Override protected void onActivityResult(int request,int result,Intent data){
        super.onActivityResult(request,result,data);
        if(request==PICK_JSON&&fileCallback!=null){
            Uri uri=result==RESULT_OK&&data!=null?data.getData():null;
            // Only grant document-provider URIs chosen by the user; never file:// paths.
            fileCallback.onReceiveValue(uri!=null&&"content".equals(uri.getScheme())?new Uri[]{uri}:null);fileCallback=null;
        }
        if(request==SAVE_JSON){
            byte[] bytes=exportBytes;exportBytes=null;
            Uri uri=result==RESULT_OK&&data!=null?data.getData():null;
            if(uri==null){reportExport("cancelled");return;}
            if(bytes==null||!"content".equals(uri.getScheme())){reportExport("failed");return;}
            try(OutputStream stream=getContentResolver().openOutputStream(uri,"wt")){if(stream==null)throw new Exception();stream.write(bytes);reportExport("saved");}
            catch(Exception e){reportExport("failed");}
        }
    }
    @Override public void onBackPressed(){
        web.evaluateJavascript("(()=>{const d=document.querySelector('dialog[open]');if(d){d.close();return 'modal';}const e=document.activeElement;if(e&&/INPUT|TEXTAREA/.test(e.tagName)){e.blur();return 'input';}return 'exit';})()",result->{
            if(!"\"exit\"".equals(result))return;
            if(web.canGoBack()){web.goBack();return;}
            new AlertDialog.Builder(this).setTitle("先歇一会儿？").setMessage("游戏进度会保留在这台设备。下次打开可以继续；未选择记住的模型 Key 会随页面关闭清除。").setNegativeButton("再坐坐",null).setPositiveButton("退出游戏",(d,w)->finish()).show();
        });
    }
    @Override protected void onPause(){super.onPause();web.onPause();}
    @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
    @Override protected void onDestroy(){if(fileCallback!=null)fileCallback.onReceiveValue(null);if(web!=null){web.removeJavascriptInterface("HXAndroid");web.destroy();}super.onDestroy();}
    private WebResourceResponse missing(){return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",new HashMap<>(),new ByteArrayInputStream("Not found".getBytes(StandardCharsets.UTF_8)));}
    private String mime(String p){String n=p.toLowerCase(Locale.ROOT);if(n.endsWith(".html"))return "text/html";if(n.endsWith(".js"))return "application/javascript";if(n.endsWith(".css"))return "text/css";if(n.endsWith(".woff2"))return "font/woff2";if(n.endsWith(".json"))return "application/json";if(n.endsWith(".png"))return "image/png";if(n.endsWith(".svg"))return "image/svg+xml";return "text/plain";}
}
