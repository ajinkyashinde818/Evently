import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    HttpClientModule   // ✅ Required for API calls
  ],
  templateUrl: './signup.html',
  styleUrl: './signup.css',
})
export class Signup {

  name: string = '';
  email: string = '';
  password: string = '';

  constructor(private http: HttpClient) {}

  signup() {

    const userData = {
      name: this.name,
      email: this.email,
      password: this.password
    };

    this.http.post('http://localhost:5000/api/auth/signup', userData)
    .subscribe({
      next: (res:any) => {
        console.log("Signup success", res);
        alert("Signup successful");
      },
      error: (err) => {
        console.error(err);
        alert("Signup failed");
      }
    });

  }

}