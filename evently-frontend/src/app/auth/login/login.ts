import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    HttpClientModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {

  email: string = '';
  password: string = '';

  constructor(private http: HttpClient, private router: Router) {}

  login() {

    const loginData = {
      email: this.email,
      password: this.password
    };

    this.http.post<any>('http://localhost:5000/api/auth/login', loginData)
      .subscribe({
        next: (res) => {

          console.log("Login success", res);

          // Save token
          localStorage.setItem("token", res.token);

          // Redirect to dashboard
          this.router.navigate(['/dashboard']);

        },
        error: (err) => {
          console.error(err);
          alert("Invalid email or password");
        }
      });

  }

}