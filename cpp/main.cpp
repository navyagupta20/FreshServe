
#include <iostream>
#include <queue>
#include <string>
#include <vector>
using namespace std;

struct Donation {
    int id;
    string food;
    int quantity;
    int hoursLeft;
};

struct CompareExpiry {
    bool operator()(const Donation& a, const Donation& b) const {
        return a.hoursLeft > b.hoursLeft;
    }
};

int main() {
    priority_queue<Donation, vector<Donation>, CompareExpiry> donations;

    int n;
    cin >> n;

    for (int i = 0; i < n; i++) {
        Donation d;
        cin >> d.id >> d.food >> d.quantity >> d.hoursLeft;
        donations.push(d);
    }

    while (!donations.empty()) {
        Donation d = donations.top();
        donations.pop();

        cout << d.id << " "
             << d.food << " "
             << d.quantity << " "
             << d.hoursLeft << "\n";
    }

    return 0;
}
