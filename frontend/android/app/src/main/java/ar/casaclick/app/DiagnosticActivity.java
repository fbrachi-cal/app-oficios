package ar.casaclick.app;

import android.os.Bundle;
import android.util.Log;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;

import com.google.android.gms.auth.GoogleAuthException;
import com.google.android.gms.auth.GoogleAuthUtil;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

import java.io.IOException;

public class DiagnosticActivity extends AppCompatActivity {

    private static final String TAG = "DIAGNOSTIC_OAUTH";
    private TextView logTextView;

    private ActivityResultLauncher<android.content.Intent> test1Launcher;
    private ActivityResultLauncher<android.content.Intent> test2Launcher;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);

        TextView title = new TextView(this);
        title.setText("OAuth Isolation Diagnostic (Phase 2)");
        title.setTextSize(20);
        layout.addView(title);

        Button btnTest1 = new Button(this);
        btnTest1.setText("Test 1: Pure GoogleSignIn (No GoogleAuthUtil)");
        layout.addView(btnTest1);

        Button btnTest2 = new Button(this);
        btnTest2.setText("Test 2: GoogleSignIn + GoogleAuthUtil.getToken (Capawesome Flow)");
        layout.addView(btnTest2);

        logTextView = new TextView(this);
        logTextView.setTextSize(14);
        logTextView.setPadding(0, 32, 0, 0);

        ScrollView scrollView = new ScrollView(this);
        scrollView.addView(logTextView);
        layout.addView(scrollView);

        setContentView(layout);

        test1Launcher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> handleResultTest1(result.getData())
        );

        test2Launcher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> handleResultTest2(result.getData())
        );

        btnTest1.setOnClickListener(v -> runTest1());
        btnTest2.setOnClickListener(v -> runTest2());

        log("Diagnostic Activity Initialized.");
        log("default_web_client_id: " + getString(R.string.default_web_client_id));
    }

    private void log(String msg) {
        Log.i(TAG, msg);
        runOnUiThread(() -> logTextView.append(msg + "\n\n"));
    }

    private void runTest1() {
        log("--- Running TEST 1: Pure GoogleSignIn (No GoogleAuthUtil) ---");
        try {
            String webClientId = getString(R.string.default_web_client_id);
            GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(webClientId)
                .requestServerAuthCode(webClientId)
                .requestEmail()
                .build();

            GoogleSignInClient client = GoogleSignIn.getClient(this, gso);
            test1Launcher.launch(client.getSignInIntent());
        } catch (Exception e) {
            log("TEST 1 Setup Exception: " + e.getMessage());
        }
    }

    private void runTest2() {
        log("--- Running TEST 2: GoogleSignIn + GoogleAuthUtil.getToken (Capawesome Flow) ---");
        try {
            String webClientId = getString(R.string.default_web_client_id);
            GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(webClientId)
                .requestServerAuthCode(webClientId)
                .requestEmail()
                .build();

            GoogleSignInClient client = GoogleSignIn.getClient(this, gso);
            test2Launcher.launch(client.getSignInIntent());
        } catch (Exception e) {
            log("TEST 2 Setup Exception: " + e.getMessage());
        }
    }

    private void handleResultTest1(android.content.Intent data) {
        Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
        try {
            GoogleSignInAccount account = task.getResult(ApiException.class);
            log("SUCCESS [TEST 1]:\nEmail: " + account.getEmail() + "\nID Token length: " + (account.getIdToken() != null ? account.getIdToken().length() : 0));
        } catch (ApiException e) {
            log("FAILURE [TEST 1]:\nStatus Code: " + e.getStatusCode() + "\nMessage: " + e.getMessage());
        } catch (Exception e) {
            log("ERROR [TEST 1]: " + e.toString());
        }
    }

    private void handleResultTest2(android.content.Intent data) {
        Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
        try {
            GoogleSignInAccount account = task.getResult(ApiException.class);
            log("GoogleSignIn Succeeded in TEST 2! Now testing GoogleAuthUtil.getToken on background thread...");
            
            new Thread(() -> {
                try {
                    String accessToken = GoogleAuthUtil.getToken(
                        getApplicationContext(),
                        account.getAccount(),
                        "oauth2:email"
                    );
                    log("SUCCESS [TEST 2 GoogleAuthUtil]: Access Token acquired! Length: " + (accessToken != null ? accessToken.length() : 0));
                } catch (IOException | GoogleAuthException e) {
                    log("FAILURE [TEST 2 GoogleAuthUtil Exception]: " + e.getClass().getName() + " - " + e.getMessage());
                } catch (Exception e) {
                    log("ERROR [TEST 2 GoogleAuthUtil]: " + e.toString());
                }
            }).start();

        } catch (ApiException e) {
            log("FAILURE [TEST 2 GoogleSignIn]: Status Code: " + e.getStatusCode() + "\nMessage: " + e.getMessage());
        } catch (Exception e) {
            log("ERROR [TEST 2]: " + e.toString());
        }
    }
}
