// The Worst possible coder! please contribute!added a new feature here!
//




#include "stdio.h"
#include <memory>
#include <string>


class Base
{
private:
    int _id;
    char* _leak;
public:
    Base()  // noexcept
    {
        _id = ClassID(); // call vfunction from constructor
        _leak = new char[255]; // leak with derived class!
    }
    ~Base() // should be virtual!!
    {
        delete _leak;       // leak with derived class!
    }
    virtual int ClassID() { return 1; }
    int GetID() { return _id; }
};


class Derived : public Base
{
public:
	Derived()
	{
		
	}
    ~Derived()  // base does not have a virtual destructor!
	{
		// will not call base! // leak in base class
	}
    virtual int ClassID()  { return 2; } // noexcept?
};

int useretval(int& uninit)
{
    uninit++;
    return uninit;
}

void LeakSomeMemory()
{
    std::string* leak = new std::string();  // obvious leak
    leak->append("hello world"); // obvious leak
}



std::string& retBadRef(const std::string& a, const std::string& b)
{
    std::string byrefret;
    byrefret += a;
    byrefret += b;
    return byrefret;  // ret local  byref 
}


class A // no virtual destructor?
{
public:
    virtual std::string GetName() const { return "A"; }
    
};

class B : public A
{
public:
    virtual std::string GetName()  const { return "B"; } // where is override?
    
};

void badfunc(A a) // oh this happens way too often!
{
    printf("badfunc: %s\n",a.GetName().c_str());
    
}

void goodfunc(A& a) // ok by  ref, should be const?
{
    printf("goodfunc: %s\n", a.GetName().c_str());

}

void path_sensitive(int *p, bool cond)
{ 
    int state=0; 
    // branch 1  
    if(p!=nullptr){ 
        state=1; 
    } 
    // branch 2 
    if(cond){ 
        state=2; 
        p = nullptr; 
    } 

    // branch 3 
    if(state==1){ 
        *p=42; // Null dereference? 
    }
}


void local_analysis(int *p, int *q, bool cond){ 
    if (p == nullptr) 
        return; 
    q = nullptr; 
    std::swap(p, q); 
    *p = 42; // Null dereference 
}

static int double_up = 0;   // lets define this in another scope

int main(int argc, const char* argv[])
{
    int uninitialized_value;
    int shadowed = 5;
    int unusedvariable = 0;

    int mispell = 23; // bad speling behiend the keiboard
    mispell++;

    int __bad_name_of_variable = 0; // __ should be exlusive to compiler stuff

	__bad_name_of_variable++;


	// shadowed value, best practice
    for (int shadowed = 0; shadowed < 10; shadowed++ )
    {
        printf("wrong type value = %llu\n", shadowed);
    }

    useretval(uninitialized_value);


    int double_up = 23; // defined globally 
    if(shadowed & 4 == 0) // check operator precedence
    {
        printf("test");
    }

    
    if(shadowed = 1) // accidental assigning
    {
        shadowed = 12;
    }

    if(uninitialized_value == 6)
    {
        printf("test2");
    }


    int fx = 7; // could be const
    int fy = 2; // could be const
    float fval = fx / fy;   // unpromoted float

    fval = fval;

    char* scalar = new char[100];

    delete scalar; // not scalar delete


    switch(shadowed)
    {
	    case 1:
            shadowed = 4;
    	break;
	    case 2:
        {
            int shadowed = 1;
        }
              break;
	    case 3:
        default:
        case 4:
            printf("yessir");
    }


    Derived derived;
    printf("Derived Class id: %d", derived.GetID());
#ifndef _WIN32
    std::auto_ptr<Derived> a(new Derived); // deprecated
#endif

    LeakSomeMemory();

    
    try
    {
        auto str = retBadRef("test", "test2");     
        printf("strings", str.c_str());     // oops, forgot expected argument in varg/
    }
    catch (...)
    {
    }


    // lets do something bad but very common
    B b;
    badfunc(b);     // nasty
    goodfunc(b);

	int p = 3;
	path_sensitive(&p, true);
	local_analysis(&p,&p,true); 
	
	std::string str="hello world!";
	printf("love strings %s",str); // not a char*
	
	{
		int p = 3;
		printf("hello %d",p);
	}
    return 0;
}

