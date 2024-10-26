# frida-findJNINativeMethods
Literally, find the JNINativeMethod structure in memory while the app is running, and print out the class, method, method signature, function address, and function offset.<br>
This is for people who cannot perform early instrumentation to hook JNIRegisterNatives to obtain JNI native methods. (e.g., cannot spawn the app but can attach to it)<br>

# Usage
1. Attach
```
frida -UF -l script.js
```

2. Find
```
Call init(<moduleName>) on terminal(e.g., init("libart.so"))
```
![image](https://github.com/user-attachments/assets/03ac2984-5009-45ac-86a7-4e2bf3ac16da)


# Contact
- Channel: https://t.me/hackcatml1<br>
- Chat: https://t.me/hackcatmlchat

